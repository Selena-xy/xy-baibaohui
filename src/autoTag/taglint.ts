/**
 * tag 确定性守卫(第七轮后的代码层兜底)。
 *
 * 背景:七轮提示词回归之后,四类违规仍跨模型版本稳定复发(faceless male on <锚点>、
 * 表情/视线/发色瞳色接 on、同色瞳色每人一份、nl 混入中文)——「写清规则」对
 * flash/pro 各档位都只能压住一部分。本模块在 tag 解析之后、出图排队之前做
 * **确定性修正**:模型再不听话,这几条硬规则说了算。
 *
 * 只做零争议的机械变换,不做任何需要语义的改写:
 * - `faceless male on <称谓>` → `faceless male`(它不是穿戴件,规范明令裸写);
 * - 表情词/视线词/发色瞳色短语/生理效果词后面接的 ` on <称谓>` → 剥掉
 *   (规范白名单:on 只属于穿戴件、服饰部件、携带物与解剖部位);
 * - 完全相同的 tag 去重(同色瞳色每人一份就落在这条上);
 * - 单串模式(comfy/NAI4)下 tag 与 nl 里的 CJK 字符剥除(V5 模式跳过——
 *   V5 的 name 与 nl 允许且要求中文原名)。
 *
 * 邻接绑定的合法形态一律不动:`white dress on green hair girl`、
 * `penis on black hair boy`(解剖部位)照旧——白名单内的 on 是刚需。
 */

/**
 * 永远不接 on 的词(规范固定词表,unanchored——称谓前缀形态
 * `<发色词> girl looking down on X` 一样要剥):
 * 表情 + 视线 + 生理效果词。命中即把「<词> on ...」从 on 处截断,词本身保留。
 */
const BARE_WORD_ON_RE = new RegExp(
  '(?:^| )(' +
    [
      'looking at viewer', 'looking at another', 'looking away', 'looking down',
      'looking up', 'looking back', 'closed eyes',
      'expressionless', 'smile', 'grin', 'laughing', 'blush', 'embarrassed',
      'frown', 'pout', 'puffy cheeks', 'surprised', 'crying', 'tears', 'angry',
      'serious', 'sad', 'worried', 'scared', 'smug', 'seductive smile',
      'half-closed eyes', 'open mouth', 'clenched teeth', 'winking', 'glaring',
      'staring', 'tongue out', 'biting lip', 'drooling', 'sweat drop',
      'calm', 'relieved', 'determined', 'nervous', 'neutral', 'smirk',
      'sweat', 'wet', 'messy hair',
    ].join('|') +
    ') on .+$',
  'i',
);

const CJK_RE = /[\u2e80-\u2eff\u3000-\u303f\u31c0-\u31ef\u3200-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]+/g;

export interface LintableImage {
  tag: string;
  nl?: string;
  characters: { tag: string; nl?: string }[];
}

export interface LintResult {
  /** 修正总处数 */
  fixed: number;
  /** 每处修正的简述(调试/控制台) */
  details: string[];
}

interface LintOptions {
  /** 楼层号,仅用于日志 */
  floor?: number;
}

/** 单条 tag 的机械修正;返回 null 表示无需修改。 */
function fixTag(raw: string, details: string[], where: string): string | null {
  let tag = raw.trim();
  if (!tag) return null;
  const before = tag;

  // 1) faceless male 不接 on
  if (/^faceless male on .+$/i.test(tag)) tag = 'faceless male';

  // 2) 表情/视线/效果词后的 on:从「<词> on」处截断,词保留
  //    (称谓前缀形态 `<发色词> girl looking down on X` 一并覆盖)
  tag = tag.replace(BARE_WORD_ON_RE, ' $1');

  // 3) 发色/瞳色短语接 on:head 以 hair/eyes 结尾时,截掉「 on ...」
  //    (解剖/服饰/携带物的合法绑定 head 不是 hair/eyes,不受影响)
  {
    const idx = tag.toLowerCase().lastIndexOf(' on ');
    if (idx >= 0) {
      const head = tag.slice(0, idx).trim();
      if (/(?:hair|eyes)$/i.test(head)) tag = head;
    }
  }
  tag = tag.replace(/\s{2,}/g, ' ').trim();

  if (tag !== before) {
    details.push(`${where} "${before}" → "${tag}"`);
    return tag;
  }
  return null;
}

/** 单个 tag 串(逗号分隔)的修正:逐条 fixTag + 完全同名去重。 */
function fixTagString(raw: string, details: string[], where: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  let fixed = 0;
  for (const piece of raw.split(',')) {
    let tag = fixTag(piece, details, where) ?? piece.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      fixed += 1;
      details.push(`${where} 重复剔除 "${tag}"`);
      continue;
    }
    seen.add(key);
    out.push(tag);
  }
  void fixed;
  const joined = out.join(', ');
  return joined === raw ? raw : joined;
}

/** nl 的 CJK 剥除(仅单串模式调用)。 */
function fixNl(raw: string, details: string[], where: string): string {
  if (!CJK_RE.test(raw)) return raw;
  CJK_RE.lastIndex = 0;
  const fixed = raw.replace(CJK_RE, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
  if (fixed !== raw) details.push(`${where} nl 剥除中文`);
  return fixed;
}

/**
 * 对一次输出的全部图片做确定性修正;**原地修改**传入的 images 并返回修正报告。
 * V5 形态(characters 非空)跳过邻接绑定类规则与 nl 的 CJK 剥除(V5 允许中文原名),
 * 但 tag 内的 fm 裸写、去重与 tag 的 CJK 剥除照常生效。
 */
export function lintImagePlan<T extends LintableImage>(images: T[], opts: LintOptions = {}): LintResult {
  const details: string[] = [];
  for (let idx = 0; idx < images.length; idx++) {
    const image = images[idx];
    const isV5 = Array.isArray(image.characters) && image.characters.length > 0;
    const where = `P${idx + 1}`;
    const fixedTag = fixTagString(image.tag, details, `${where} tag`);
    if (fixedTag !== image.tag) image.tag = fixedTag;
    if (image.nl && !isV5) {
      const fixedNl = fixNl(image.nl, details, where);
      if (fixedNl !== image.nl) image.nl = fixedNl;
    }
    for (let ci = 0; ci < (image.characters ?? []).length; ci++) {
      const character = image.characters[ci];
      const fixedCharTag = fixTagString(character.tag, details, `${where} 角色${ci + 1} tag`);
      if (fixedCharTag !== character.tag) character.tag = fixedCharTag;
    }
  }
  void opts;
  return { fixed: details.length, details };
}
