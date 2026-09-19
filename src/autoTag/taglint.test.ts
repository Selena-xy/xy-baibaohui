import { describe, expect, it } from 'vitest';
import { lintImagePlan } from './taglint';

/** 实跑样本直接进测试:全部来自第六/七轮「联姻妻子」「现代唯我独法」的真实输出。 */
describe('taglint 确定性守卫', () => {
  it('faceless male 剥 on(跨三档模型复发的那条)', () => {
    const images = [{ tag: '1boy 1girl, medium shot, faceless male on short black hair boy, white t-shirt on short black hair boy', nl: undefined, characters: [] }];
    const res = lintImagePlan(images);
    expect(res.fixed).toBeGreaterThan(0);
    expect(images[0].tag).toContain('faceless male, white t-shirt on short black hair boy');
    expect(images[0].tag).not.toContain('faceless male on');
  });

  it('表情/视线接 on 剥掉,称谓前缀写法不误伤', () => {
    const images = [{
      tag: 'expressionless on short black hair boy, serious on long black hair girl, long black hair girl looking away, black hair girl smile',
      nl: undefined,
      characters: [],
    }];
    lintImagePlan(images);
    expect(images[0].tag).toContain('expressionless,');
    expect(images[0].tag).toContain('serious,');
    // 合法的前缀写法一字不动
    expect(images[0].tag).toContain('long black hair girl looking away');
    expect(images[0].tag).toContain('black hair girl smile');
  });

  it('视线 on 形式剥掉(looking down on 语义会反的那种)', () => {
    const images = [{ tag: 'long black hair girl looking down on silver hair girl, smile', nl: undefined, characters: [] }];
    lintImagePlan(images);
    expect(images[0].tag).toContain('looking down,');
    expect(images[0].tag).not.toContain('looking down on');
  });

  it('发色/瞳色短语剥 on;解剖与服饰绑定(白名单)不动', () => {
    const images = [{
      tag: 'black eyes on short black hair boy, short black hair on black hair boy, penis on black hair boy, white dress on green hair girl, large breasts on green hair girl',
      nl: undefined,
      characters: [],
    }];
    lintImagePlan(images);
    expect(images[0].tag).toContain('black eyes,');
    expect(images[0].tag).toContain('short black hair,');
    // 白名单内的刚需绑定原样保留
    expect(images[0].tag).toContain('penis on black hair boy');
    expect(images[0].tag).toContain('white dress on green hair girl');
    expect(images[0].tag).toContain('large breasts on green hair girl');
  });

  it('完全同名 tag 去重(同色瞳色每人一份落在它头上)', () => {
    const images = [{
      tag: '1boy 1girl, medium shot, short black hair, black eyes, long black hair, black eyes, smile',
      nl: undefined,
      characters: [],
    }];
    const res = lintImagePlan(images);
    expect(res.fixed).toBeGreaterThan(0);
    expect(images[0].tag.match(/black eyes/g)).toHaveLength(1);
  });

  it('单串模式 nl 里的 CJK 剥除(清冷泄漏样本)', () => {
    const images = [{
      tag: '1girl, medium shot, expressionless',
      nl: 'A girl with long black hair maintains a清冷 expression. Soft morning light fills the hallway.',
      characters: [],
    }];
    lintImagePlan(images);
    expect(images[0].nl).toBe('A girl with long black hair maintains a expression. Soft morning light fills the hallway.');
    expect(images[0].nl).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('V5 形态(characters 非空)跳过 nl 的 CJK 剥除与绑定类规则,tag 去重照常', () => {
    const images = [{
      tag: '1girl, classroom',
      nl: 'Base scene.',
      characters: [
        {
          // V5 允许中文原名出现在 nl(名字保持原文);tag 内 fm on 仍要剥
          tag: 'girl, long black hair, faceless male on girl, black eyes, black eyes',
          nl: '小雪站在教室里。',
        },
      ],
    }];
    lintImagePlan(images);
    expect(images[0].characters[0].tag).toContain('faceless male,');
    expect(images[0].characters[0].tag.match(/black eyes/g)).toHaveLength(1);
    expect(images[0].characters[0].nl).toBe('小雪站在教室里。');
    expect(images[0].nl).toBe('Base scene.');
  });

  it('合法输出零修改(回归守卫:lint 不应碰干净的 tag)', () => {
    const clean = '2girls, medium shot, long hair, black hair, blue eyes, silver hair, red eyes, petite on silver hair girl, white dress on black hair girl, black hair girl waving, black hair girl smile, silver hair girl blush';
    const images = [{ tag: clean, nl: 'Two girls in a park.', characters: [] }];
    const res = lintImagePlan(images);
    expect(res.fixed).toBe(0);
    expect(images[0].tag).toBe(clean);
    expect(images[0].nl).toBe('Two girls in a park.');
  });
});
