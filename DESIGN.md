# ST-BaiBai-Image（柏宝绘）设计草案

> 状态：讨论稿，记录当前已经确认的产品思路与推荐实现方案，不代表相关功能已经完成。

## 0. 本 fork 的设计增量

> 以下条目只存在于本 fork（`Selena-xy/xy-baibaohui`），上游没有；阅读正文时先看这里可快速定位差异。

### 0.1 提示词规范与出图渠道解耦（v0.2.7）

- 新增 `settings.autoTag.promptStyle`：`'auto' | 'comfyui' | 'nai'`，默认 `'auto'`（跟随出图渠道，老配置行为逐字节不变）。
- 新增 `settings.autoTag.comfySpecNl`：**非** ComfyUI 后端选用 ComfyUI 规范时，独立控制是否产出自然语言 nl；ComfyUI 后端仍只看工作流预设的 `naturalLanguage`，不设第二个真相。
- `autoTag/prompt.ts` 的 `effectivePromptStyle(options)` 是唯一判据，规范与思维链成对取，`naiCharPromptsOn` 为假时下游整链自动切到单串那一支。
- 背景：NAI 协议 + ComfyUI 系底模的兼容站会把 `char_captions` 压平成单串送进工作流；NAI 规范禁止的邻接绑定反而成为唯一可用的多角色区分手法，身份 tag 的圆括号必须按 ComfyUI 口径转义。
- 面板入口：NAI 渠道页 →「生成提示词规范」。

### 0.2 内置提示词调优（v0.2.7）

四条内容改动，全部只动 `state/settings.ts` 的内置默认常量，协议与代码分支不变：

1. **ComfyUI 规范/思维链补显式 NSFW 解剖落点**：对齐 NAI 那两份已有的条款——显式场景写实际可见的解剖词（`breasts`、`nipples`、`penis`、`pussy` 等）并按发色称谓邻接绑定到人，禁止 `nsfw`/`nude`/`sex` 泛化词，遮住/画外的不写。ComfyUI 单串没有 `source#`/`target#`，归属全靠邻接绑定，这是与 NAI 版本的唯一差异。
2. **开启自然语言时 tag 精简到 20～30 个**：ComfyUI 规范原为短 tag 优先的 Checkpoint/Illustrious 写；Anima/Qwen 链路自然语言优先，tag 过多反而稀释语义。只在 `{{nl}}` 展开时生效，纯 tag 用户不受影响；思维链第三层同步加「tag ≤ 30 且细节留给 nl」自查。
3. **思维链 B 段拆出【一次性】角色**：与 NAI V5 思维链同构——【已建档】/【本次建档】/【一次性】三分类；【一次性】不建档不写 changes，入画时当普通角色写进 tag 串，外貌按世界观一次补全、不编造人名；第二层角色行与第三层自查同步。
4. **表情词表 +7 个稳定词**：`winking`、`glaring`、`staring`、`tongue out`、`biting lip`、`drooling`、`sweat drop`（ComfyUI / NAI / NAI V5 三份同步），保留「未列出的词一律不许自创」的防呆边界。

### 0.3 实跑回归修正（v0.2.7）

拿一份真实聊天导出（`pingran`，8 张图 / 5 个 AI 楼，配置 `promptStyle='comfyui'` + NAI 渠道）对照内置文案逐条核对，修掉四类被实测暴露的问题：

1. **`2people` 这类自造人数 tag**：danbooru 没有 `Npeople`，模型却在 6/8 张里额外补了个总数。规范与思维链人物槽都加「人数 tag 只用 danbooru 标准词（1girl / 1boy 1girl / 2girls），不要 2people」。
2. **核心动作被写成英文长句**：实测出现 `man's hand pressing deep into woman's waist`、`man's fingers inserted into woman's pussy`、`man's hand tearing the crotch of woman's black pantyhose` 等 5/8 张。这类句子不是 danbooru tag、且与 nl 重复。规范加对照改法（→ `groping` / `hand on another's waist` / `fingering` / `torn pantyhose`），思维链核心动作槽与第三层自查同步收紧。
3. **建档字段混入临时状态与不可渲染内容**：实测 `hair` 存成 `long silver hair in an elegant bun`（盘发是一次性造型，却被逐字照抄进 8/8 张图）、`outfit` 存成 cosplay 这身临时服装、`body` 存 `178cm`/`170cm+`、`extra` 存 `gentle handsome type`/`professional cosplayer`（气质评价与身份事实，画不出来）。建档规则拆出「字段值必须是 danbooru 画得出的英文词」「临时状态一律不写（点名临时发型与当前这身衣服）」「outfit 没有长期招牌着装就留空」三条；`hair` 的口径从「长度/发型」收紧为「长度」（避免模型把 bun 当长期发型）。
4. **身份 tag 的圆括号一律不转义（两套规范就此统一）**。这条改了两轮，以实跑结论为准：最初按「ComfyUI 会把裸括号当权重语法」的口径要求转义，实测发现反了——**给括号加转义会把整套官方设定强行套满角色、压掉服装神态动作场景等细节描写；括号保持原样时模型照样认得是该作品的角色，同时更听得进画面里的其余细节**。故 ComfyUI 规范/思维链改为「括号保持原样、一律不转义」，`fields.fandom` 与落进画面 tag 用同一形态。
   > 副产物：两套规范在这一点上一致了（NAI 侧本来就是裸括号），档案可跨渠道移植，原先「切到 NAI 时把反斜杠原样发出去」的隐患一并消失。

> 注：P6（8/8 张全 `medium shot`、取景无变化）经判断属于封闭场景下的合理选择，**刻意不改**。

### 0.4 第二轮实跑回归 + 「无面男」开关（v0.2.7）

拿第二份导出（`promptStyle='comfyui'`、单楼 1～3 张、11 张图）复核，处理四件事：

1. **删掉核心动作段的「before → after」对照改法**。上一版给的是「`man's hand pressing deep into woman's waist` → `groping, hand on another's waist`」这种写法，实测**模型把前半句也抄进了 tag**（漏出 `1boy's hand pressing deep into 1girl's waist`、`1boy holding strap`），而且这些例子的主语（man/woman/boy/girl）还带出了「拿数量词当绑定锚点」的副作用（`white t-shirt on 1boy`）。改为**只给正面词表**（`groping`、`hand on another's waist`、`touching crotch`、`fingering`、`penetration`、`tearing pantyhose`、`kabedon`、`leaning against another` 等），并把自查里的反面句子引用一并去掉。
   > 结论沉淀：**「禁止某个 token」有效（`2people` 一次就消失），「展示一句反面短语」会泄漏**（`gentle smile`、句子对照都被照抄过）。规范里不再出现任何反面例子。
2. **表情词改为「原样取用一个词」的正向表述**（D）。旧文案用「`gentle smile` 写 `smile`」示范，`gentle smile` 反而出现在 5/11 张图里；改成「从列表原样取用、不得加形容词/拼接/自造」后，反面例子从规范中彻底消失。
3. **新增「无面男」开关**（`settings.autoTag.facelessMale`，默认关）：开启后，画面里**男性与女性同框时男性不画脸**——不加表情与视线，改落一个 `faceless male`，把视觉焦点让给女性角色，nl 里同样不描述他的面部；男性单独出镜时照常画脸。默认关 ⇒ 存量配置行为逐字节不变。
   - 两处下发缺一不可：任务协议里给输出口径（`facelessMaleRule`），**思维链末尾**再追加一条「优先于以上所有条目」的覆盖块。因为思维链是最后一条 system 且通篇要求「每个在场角色都必须有表情词和视线词」，只在协议里写会被它压回来。
   - 覆盖块用追加（而非改常量）实现，因此对三份内置思维链和用户自定义思维链一律生效。
4. **人数 tag 与绑定锚点的两个残留问题**（`2girls` 与 `1boy 1girl` 并存、用 `1girl`/`1boy` 当锚点）经确认**本轮不动**——归入观察项，留待下一轮实跑再做判断。

### 0.5 第三轮实跑回归（v0.2.7）

拿第三份导出（`promptStyle='comfyui'` + 开 nl + 开「无面男」、5 个 AI 楼、15 张图）复核。先记验收：0.4 的改动**全部守住**——表情/视线 15/15 张齐全且全是列表原样单词（`gentle smile` 类形容词修饰 0 次）、上一轮的反面例子 0 泄漏、`2people` 0 次、锚点 0 次用 `1girl`/`1boy`（两个「观察项」就此销账）、`faceless male` 13/15 张落地且男性表情/视线与 nl 面部描述均为 0 次；NSFW 解剖绑定（`pussy on silver hair girl`）稳定生效。

本轮新暴露四类问题，全部只动内置文案：

1. **男女同框时「女方的专属件」整片裸写（12/13 张双人图）**。同一张图里男方的衣服绑得干干净净（`casual wear on black hair boy`），女方的 `blue and black gradient dress`、`sheer black pantyhose`、`silver strappy high heels`、`large breasts`、`tall`、`mature female`、`silver-blue glitter makeup` 却全部飘着；只有 1 张绑对了裙子。规范里明明写了「`pantyhose` 这类只有一个人穿的部件也必须带上主人」、思维链自查也点了名，实测照样 5 张裸写 `sheer black pantyhose`——因为那条规则的上下文是「两人都穿校服但男女版型不同」，是个假设句，`1boy 1girl` 这一支读不到约束。改法：把「只要同框还有第二个人，凡只有其中一人会有的东西都要带上主人」写成**无条件条款**，并补 `1boy 1girl` 的具体举例（裙/袜/鞋/妆容/胸/身高体型都写成 `on silver hair girl`）；「照抄不豁免（多人）绑定」同时写进规范与任务协议（库照抄与邻接绑定撞车时，模型选了「一字不改」）。
2. **词表有词也被改写、表外动作则自造短语（13/15 张）**。模型把 `hand on another's waist` 改写成 `hand on girl's waist`（`another` 被当成可替换的占位符），表外动作则一律自己拼成 `<动作> on another` 结构：`hand between another's legs`、`fingers on silver hair girl`、`hand inside panties`、`leaning head on another`、`hand on another's wrist`、`lifting another`、`penetration under skirt`、`clinging to another`、`hugging from behind`，还有整句塞进 tag 的 `black hair boy tapping phone on gate`。改法：定死「词表逐字照抄、`another` 不许替换成 `girl's`/`boy's`」，讲清**互动类动作词本身就说明谁对谁、不需要再加主人**（只有单人动作才需邻接绑定），再给一条回落阶梯——手部接触回落到 `hand on another's waist / hip / ass / thigh / inner thigh / shoulder / arm / head / chest`，抱/抬/贴靠回落到 `carrying` / `hug from behind` / `leaning against another`，仍落不下就只写 `groping` / `fingering` / `penetration` 这类通用词、细节交给 nl。词表只补真正缺词的、确定的 danbooru 词（`hand on another's ass`、`hand on another's thigh`、`panties aside`、`spread legs`、`hug from behind`、`carrying`、`standing sex`），**不把实跑里那批自造短语字典化**——那等于把自造词洗白，还会让一张图越堆越多动作词。
   > 维护纪律：`another` 的禁止项只写「不许替换成 `girl's`/`boy's` 或任何发色称谓」这种 token 级禁令，**不写出被泄漏的那整句**（0.4 的结论：展示反面短语会泄漏）。
3. **`landscape` 被写进 tag 串的构图位**（1/15 张）。那张图因此没有任何景别词，而画幅方向本来就有独立的 `size` 键。改法：三份规范（ComfyUI / NAI 单串 / NAI V5）都点明「`portrait` / `landscape` 只写在 `size` 键，tag 串里不得出现这两个词」。
4. **「无面男」的男性会整条消失**（2/15 张，都出现在男方主导的插入镜头）。这时 tag 串里只剩一个人数 tag：没有 `faceless male`、没有发色锚点、没有上衣，解剖词反而裸写成 `penis`，而 nl 里仍写着 `the faceless boy`——tag 与 nl 打架。改法：任务协议与思维链覆盖块两处都补「只要人数 tag 里有 `1boy`，他在 tag 串里就必须始终有自己完整的一份（发色锚点、可见服装、`faceless male`），不许只留一个人数 tag 就让他整条消失在串外；解剖部位照旧绑定到他身上（`penis on black hair boy`）」。

> 观察项（本轮不动）：nl 的多人三段式（总起 `as the main focus` → 每人一句 → `blurred in the background` 收尾）实测 13 张双人图里只有 3 张带总起、1 张有收尾，画面本身没出问题，先不动；同一楼内 `hair bun` 时有时无（正文写的是银白发髻）属连续性小瑕疵，留待下轮看是否复发。

### 0.6 第四轮实跑回归（v0.2.7）

用户在同一份导出（同 5 个 AI 楼、正文未变）上重跑一轮，得 14 张图。这一轮的价值在于**同一份正文的前后对照**：0.5 的四条逐条验收——

- **A 生效，且干净**：13 张双人图里女方的 `blue and black gradient dress`、`sheer black pantyhose`、`silver strappy high heels`、`tall`、`silver-blue glitter makeup` 与男方的 `grey hoodie` **全部带上了主人**；上一轮那种整片裸写从 12/13 张降到 **0 张**（唯一两张裸写的是一张单人物图的 `blue and black gradient dress`，本来就无需绑定）。
- **B 生效**：`hand on another's waist`、`hand on another's inner thigh`、`hand up skirt`、`fingering`、`penetration`、`tearing pantyhose`/`torn sheer black pantyhose`、`holding strap`、`kabedon`、`leaning back`、`leaning against another`、`hug from behind`、`carrying`、`standing sex`、`groping` 全部**逐字取自词表**；`another` 被换成 `girl's`/`boy's` 的改写与上一轮 12 处自造短语（`hand between another's legs`、`fingers on silver hair girl`、`lifting another`、`clinging to another`、`tapping phone on gate`…）**一处不复现**。
- **C 生效**：`1boy 1girl` 的 13 张图里男性**每张都有完整一份**（发色锚点 + 可见服装 + `faceless male`），上一轮那种「只剩一个人数 tag、男性整条消失」0 张；解剖词也绑好了（`penis on black hair boy`、`erection on black hair boy`，上一轮是裸写 `penis`）。
- **D 生效**：14 张图的 tag 串里**没有** `portrait`/`landscape`；景别词都是真正的镜头词。

同时暴露一条**由 0.5 的 A 条款自己带来的新问题**，以及两处小偏差：

1. **`on` 形式被推广到锚点自身与视线词（9/13 张）**。A 条款给的写法是「`<件> on <发色词>`」，模型把它推广到了不该用的地方：锚点自己被绑定——`long silver-white hair in a cold elegant bun on silver hair girl`、`short black hair on black hair boy`、`blue eyes with silver-blue glitter makeup on silver hair girl`（妆容那条例句把 eyes 一起拖下水）；视线词也被接上 `on`——`looking down on silver hair girl`、`looking away on silver hair girl`、`looking at another on silver hair girl`，其中 `looking down on …` 语义已经反了（读成「俯视某人」而不是「她向下看」）；另有 1 张视线干脆裸写（`looking at another`），是 0.4 就禁止过的。
   改法：在 A 那条后面补「**锚点自己永远不带 `on`**：发色与瞳色的短语照常裸列……需要点名谁的妆容时**单独写一条** `<妆容> on <发色词>`，别把 eyes 与妆容合成一条」；在表情/视线那条后面补「绑定一律用**称谓前缀**写法（`<发色词> girl smile`、`<发色词> girl looking away`）；表情与视线**不要用 `on` 形式**——视线词接上 `on` 会变成另一个意思」。
   > 这是「给例子就会被推广」的又一例：例子要给，但必须同时写明例子的**适用边界**。
2. **表情词形漂移（1 张）**：写了 `frowning`，列表给的是 `frown`。补「从列表里**连词形一起照抄**」。
3. **体型与动作的短语化/堆叠**：`tall and curvaceous with long legs on silver hair girl`（带 `and`/`with` 的长短语，不是 danbooru 短 tag）2 张；一张图里堆了 `standing sex` + `penetration` + `penetration from below` + `carrying` 四个同义动作词。分别补「体型只用短词逐个写（`tall`、`curvy`、`long legs` 各算一条）」「同一场互动只写一个主词，最多再补一个方向或部位词」。

> 又一次观察项：nl 的总起句这轮 **14/14 张齐全**（上一轮 3/13），但收尾句 `blurred in the background` 仍只 1/14——画面没出问题，继续不动；`hair bun` 仍时有时无（9/14 张写了）。

4. **同人身份 tag 转义格式与纯小写回归**：按用户实际出图需求，ComfyUI 下同人角色身份 tag 改回带斜杠转义格式 `shorekeeper \(wuthering waves\)`（未转义括号会被 ComfyUI CLIPTextEncode 当作权重语法拆散）。同时增加**全英文小写禁令**（词语内严禁大写字母）：实跑中模型把同人词写成了 `Shorekeeper (Wuthering Waves)` 包含多处大写，规范和思维链均明确严禁任何大写，一律写成纯小写。

### 0.7 第五轮实跑回归（v0.2.7）

拿第五份导出（新正文：上海地铁 + 贝尔法斯特 cosplay，16 个 AI 楼 / **51 张图**）复核。先记验收——0.6 的 A/B/C 三条**全部守住**（D 那条 `size` 词不入 tag 本轮复发，见下第 1 条）：51 张图的 tag 串里大写字母 **0 次**、`belfast \(azur lane\)` 转义小写格式 **51/51 张**落地、锚点自我绑定 **0 次**、表情与视线接 `on` **0 次**、单张 tag 数 12～25（都远在 40 以内）。

本轮新暴露四类问题 + 两处连续性偏差，全部只动内置文案：

1. **`portrait` / `landscape` 又写回 tag 串的构图位（3/51 张，同一楼）**。0.5 的 D 已经修过一次、第四轮验收也过了，这轮复发——根因不在那条禁令，而在思维链槽位块的前言：「槽位值直接写你最终要放进 tag 的英文词」，而 `size` 本身就是七个槽位之一。改法：前言里显式豁免 `size` 槽位（「**size 槽位例外**：它只写进 JSON 的 size 键，绝不进 tag 串」），三份思维链同步。
   > 沉淀：**「槽位值就是 tag 词」这种全局句会盖过后面某一条槽位的局部禁令**——局部禁令要写在它自己那一处，而不是只在别处声明。
2. **画面里出现第三个可见人物时人数 tag 崩了（1/51 张）**：那一楼的正文里，车厢连接处站着一位盯着抢单界面的外卖骑手，模型把人数写成 `1boy 1girl, 1boy`——既没说清第三个人，又把同一个数量词写了两遍（正确写法是 `2boys 1girl`）。改法：人数词表补齐混合计数（`2boys 1girl` / `1boy 2girls` / `2boys 2girls` / `multiple boys` / `multiple girls`），并加一条「**人数 tag 要覆盖画面里所有可见人物，且每个数量词只写一次**」——站在画面里、没被虚化成一片的第三者（店员、路人、外卖骑手）也要算进去，只有模糊成一片的人群才不计数；思维链人物槽与第三层自查同步。V5 那份 Base 也补了同一条（`a third person visible inside the frame makes the count 2boys 1girl, never 1boy 1girl, 1boy`）。
3. **配角的锚点是编出来的（1/51 张）**：正文只给了「外卖骑手 + 黄色制服 + 头盔」，模型据此推出 `yellow hair boy` 当锚点（把**制服颜色**当成了发色），再用它绑定 `yellow hair boy serious` / `yellow hair boy looking at phone`。改法：加「**锚点只能是正文/设定给出的发色或瞳色**」——不得从服装、道具的颜色推出发色（写了 `yellow jacket` 不等于 `yellow hair`），也不得给没有设定的配角编一个发色；配角没有明确发色时用身份词（`man`/`boy`/`passerby`）或直接裸写他独有的可见特征（`yellow jacket`、`helmet`）——配角独有的特征不会认错人，本来就不需要绑定。
4. **绑定被推广到三类不该绑的词上**（本轮最值钱的一条）。0.5 的 A 条款把绑定写成了无条件义务，这轮它溢出了边界：
   - **生理效果词**：`sweat on silver hair girl`、`tears on silver hair girl`、`drooling on silver hair girl`、`messy hair on silver hair girl`——效果词不会把两个人的特征搞混，接上 `on` 只变成模型没见过的词组；
   - **状态与接触类动作词**：`hand up skirt on black hair boy`、`touching crotch on black hair boy`、`biting earlobe on black hair boy`、`supporting another on black hair boy`——0.5 的 B 条款明明写着「互动类动作不需要再加主人」，但模型把状态词也当成了需要主人的单人动作；其中 `panties aside on black hair boy` 最严重：**内裤是女方的**，挂到男方身上会被画成男方穿着内裤；
   - **单人画面里的解剖词**：`penis on black hair boy` 出现在一张 `1boy` 单人图里（同类还有 `1girl` 单人图里的 `large breasts on silver hair girl`、`blue maid dress on silver hair girl`）——只有一个主体时自我绑定纯属白占 token。
   改法：把绑定范围写死——「**绑定只在两人及以上同框时才用**」，单人画面所有特征裸写；另立一条「**下面三类词永远不绑定，裸写即可**」逐类点名（效果词 / 状态与接触动作词 / 单人画面的解剖词）；再加「**动作词与部位不得拼成一条**」——`groping breasts on …`、`squeezed breasts on …` 这种把动作和绑定部位粘起来的写法不是 danbooru 词，要拆成 `groping` + `breasts on <发色词>` 两条。
   > 与 0.4/0.5 同一纪律：这条只写 token 级禁令（「不许给 `panties aside` 这类词接 `on <发色词>`」），**不写出被泄漏的那整条短语**。
5. **同一件衣服/饰品在同楼内换名字**：颈饰在 `choker` / `black choker` / `black leather choker` / `black leather collar` 之间来回换，还有一张干脆写成 `black neck ribbon`（正文写的是黑色皮质项圈）；裤袜在 `black pantyhose` / `sheer black pantyhose` / `sheer black thigh high stockings` 之间换（正文写的是**过膝袜**，带蕾丝防滑边，不是连裤袜）；还有一张把整件 `blue maid dress` 换成了 `corset`（正文里的硬质紧身胸衣是长裙的胸衣部分，不是独立外穿件）——那张图的裙子就此消失。改法：加「**同一件服装/饰品的措辞整楼逐字复用**」——同一样东西定下哪种说法整楼都用哪种，同义词改写等于换了件衣服；裤袜按正文区分连裤与过膝袜（`pantyhose` vs `thigh high stockings`），视觉指纹里也补上「款式」这一维；局部件是补充不是替代，整件裙装的指纹照旧要写全。
6. **不露脸的局部特写没有表情与视线（3/51 张）**：一张只拍腿、一张只拍十指相扣的手、一张只拍男方下身——模型都没写表情与视线，而规范里写的是「每张图都要写，不得省略」，第三层自查也点名「没有漏掉表情、视线」。这三张的取舍其实是对的（硬写 `expressionless` 只会让模型给没脸的地方塞一张脸）。改法：给表情与视线那条加例外——**画面里根本不出现脸的局部特写（只拍手、腿、脚、道具）允许省略**，第三层自查同步放宽。
7. **规范里的具体例子被照抄进画面（第 2、3 次实证）**：`1boy 1girl` 的绑定举例里原先写着「`silver hair girl` 的 `blue and black gradient dress`、`sheer black pantyhose`、`silver strappy high heels`…」，那是**第三轮那位角色的真实行头**。第四轮的 13 张双人图整片照抄了这三个词；本轮换成地铁 cosplay 这一场后，正文写的是过膝袜，前两张图仍然写出了 `black pantyhose` / `sheer black pantyhose`——例子泄漏了。改法：把举例里的锚点与单品全部换成中性占位（`green hair girl` + `white dress` / `long skirt` / `high heels`），并加一条元规则——「**本规范里出现的发色与单品全是占位例子**，绝不许照抄进画面」；任务协议里 `large breasts on silver hair girl` 那条同样改成 `green hair girl`。
   > 例子的正面价值仍然保留（0.4 的结论是「展示反面短语会泄漏」，不是「不能给正面例子」），但**例子必须与任何一次真实出场都对不上**，泄漏才可被发现。

> 观察项（本轮不动）：nl 多人三段式的收尾句 `blurred in the background` 依旧稀疏；`cosplay` 这个 tag 前 8 张有、之后消失，属第 5 条同一类（措辞漂移），本轮只立规则、不改取值口径。

### 0.8 第六轮实跑回归（v0.2.7）

拿第六份导出（新剧情「现代唯我独法」，现代都市、无 NSFW，14 楼 / 42 张，`promptStyle` 解耦链路）逐图核对。先记验收——前五轮的高危项大面积守住：tag 串里 `portrait` / `landscape` **0 张**、大写字母 **0 张**、`2people` 类自造总数 **0 张**、例句占位泄漏 **0 张**、单人解剖词绑定 **0 张**、建档没有身高/气质/临时服装混入、主角 outfit 正确留空。42 张里 26 张完全干净。

本轮新暴露四类复发 + 两个规范灰区 + 两个建档问题：

1. **人数 tag 词表仍有第四种自造词**（13/42 张）：`1man`×8、`2men`×1、`multiple people`×1——danbooru 没有 1man/2men，成年男性同样写 boy（大叔与少年同框写 2boys）；同一对人物（少年+司机）跨楼在 `1boy 1man` 与 `2boys` 之间漂移。改法：规范与思维链的人数词表显式封口「danbooru 也没有 1man、2men、1woman」，并禁止在覆盖性数量词之外再叠 `multiple people` 总数；建档 `fields.sex` 同步钉死只写 `1girl / 1boy`。
2. **on 的边界四轮五轮各修一条仍被各个击破**：`sweat on black hair boy`（第五轮禁的效果词）、`short black hair on black hair boy` / `black eyes on black hair boy`（第四轮禁的锚点自身）、`expressionless on short black hair boy`（第四轮禁的表情 on 形式）各复发一次。三条禁令分散在三处、每处都在讲「什么不许」，模型总有地方读漏。改法：把散落的负面清单合并成**一条正面封口**——「on 只能接在『会认错人』的穿戴件、服饰部件、携带物与需要归属的解剖部位后面；发色瞳色、表情、视线、效果词与单人画面的一切词永远不出现在 on 后面」，规范与思维链第三层各写一遍。
3. **单人图视线写 `looking at another`**（1 张，本楼第一张就犯）：画面里没有「另一个人」，another 无处可指。顺带发现思维链表情/视线槽的兜底词写的就是 `expressionless / looking at another`——等于在无人的楼里递刀。改法：规范视线词表加「another 只在画面确有另一人时使用」，三份思维链兜底词改为 `looking at viewer`，第三层自查加「单人画面的视线里没有 looking at another」。
4. **SFW 物品交互短语自造**（约 8 张）：`hand on another's items`、`hand on another's documents`、`man handing another's lottery ticket`、`black hair boy hand writing` 等。回落阶梯只覆盖人际互动，SFW 场景无词可落，模型只能自拼——这是规范缺口不是模型乱来。改法：给「与物品、环境的互动」一条合法出路：通用动词（holding/writing/typing/pointing/lifting/entering）+ 物品单独一条，禁止把称谓、another 或 on 拼进物品动作，方向细节交给 nl。
5. **「无面男」在男男同框时时有时无**（男男同框 8 张里忽有忽无，同一楼三张都能不一致）：规则只写了「男女同框」，男男场景模型只能乱猜。按规则目的（把视觉焦点让给女性）收敛口径：**只在男女同框时生效**，男男同框与男性单人一样照常画脸；任务协议与思维链覆盖块同步改写，男性完整性条款加「男女同框时」前提。
6. **同名角色重复建档**（女柜员建了两次，第二次字段还漂移：brown eyes → black eyes）：代码层 `applyCharTagOps` 正确丢弃了重复建档（库里保住 brown eyes），但模型凭印象重写的外貌已经落进当张 tag，相邻楼层瞳色漂移。改法：规范、任务协议、三份思维链 B 段与第三层自查四处钉死「field:"new" 只发给库里确实没有的角色——同名条目存在就照抄库字段，觉得库字段与正文不符时以库为准，固定特征不许改写」。
7. **建档 hair 混入造型**（Sherry 存了 `black hair updo`）：第三轮已把 hair 口径收紧为「长度」，本轮补上 token 级禁令——盘发、扎发、丸子头、编发、马尾（含 bun / updo）永远不进 hair，哪怕看起来是长期发型；第三层自查同步改「长度（不含造型）」。

> 沉淀：①负面清单修不完——同一类错误（on 边界）禁了四次漏三次，换成一条正面封口（on 只许接什么）才是收敛解；②规范没覆盖的场景（男男同框、SFW 物品交互）模型不会「跳过」，只会乱猜——灰区要么补规则、要么给合法出路；③代码层守卫（重复建档丢弃）挡得住档案走样，挡不住画面漂移——提示词层的「以库为准」必须同步钉死，否则守卫只是把错误从档案转移到了画面。

> 观察项（本轮不动）：nl 收尾句 `blurred in the background` 依旧稀疏（6/42）；nl 与 tag 的一致性、服装跨楼连续性（模型自发维持了主角「黑 T + 工装裤 + 斜挎包」整套视觉指纹）表现良好。

## 1. 插件目标

柏宝绘在 SillyTavern 生成新的 AI 正文后，发起一次与正文生成相互独立的 AI 请求，用它完成以下工作：

1. 判断最新 AI 楼层中是否存在值得生成图片的场景。
2. 在用户设定的单楼最大图片数以内，选择最有价值的画面。
3. 为每个画面生成适合目标生图后端的提示词。
4. 将可编辑的生图 tag 插入对应正文位置。
5. 调用 ComfyUI、NAI 或 WebUI 等后端生成图片。
6. 将图片显示在对应 tag 所在位置，并允许用户修改 tag 后重新生成。

当前优先完成 ComfyUI 链路；其他后端在统一任务模型之上逐步接入。

## 2. 核心设计原则

### 2.1 正文 tag 与图片结果分离

采用混合存储：

- 生图 tag 写进 `message.mes`，作为提示词的真实来源以及稳定的位置锚点。
- 图片 URL、种子、后端信息、工作流信息和生成状态保存在消息扩展数据中。
- 渲染时按当前 swipe 中 tag 的出现顺序和提示词哈希关联图片结果，将图片放到 tag 所在位置。

这样同时满足：

- 用户可以直接用 ST 的消息编辑器修改提示词。
- 用户修改或移动正文时，tag 和图片位置会随正文一起移动。
- 图片数据不需要以 Markdown URL、Base64 等形式污染正文。
- 同一 tag 可以保留多次生成结果，支持重新生成和切换图片。

### 2.2 首次定位使用段尾位置 ID

插件清洗目标正文后，在每个保留的非空物理行末尾追加短位置 ID（如 `⟦P1⟧`）。AI 只返回位置 ID 和提示词，插件通过本地映射把 tag 插到对应原始物理行之后，不让模型复制原文或回传完整正文。

位置 ID 只服务于首次插入，不写入正文。正式 tag 写入后，tag 自身随正文移动；后续图片渲染不再依赖旧位置 ID。

### 2.3 不静默截断上下文

插件不提供“最大上下文字数”或“最大上下文 Token 数”限制。

- 保留“携带最近 AI 楼数”的数量设置，默认建议为 2；目标楼计入数量，中间的 user 楼一并携带。
- 被选中的楼层按柏宝书口径清洗后发送，不做字符或 token 截断；历史楼保留 `<bbi_image>`。
- 柏宝书状态快照完整发送。
- 如果模型供应商因自身上下文窗口拒绝请求，向用户报告错误，不在后台静默裁剪内容。

## 3. 自动任务流程

一次完整任务建议分为以下阶段：

```text
ST 完成新的 AI 正文
  -> 锁定 chatId / floor / swipeId / sourceHash
  -> 读取并清洗最近 N 个 AI 故事楼及其间 user 楼
  -> 读取柏宝书当前有效状态及 D1/D2 语义
  -> 调用独立 AI 判断是否需要图片
  -> 校验 AI 返回的 JSON、目标位置 ID 和正面提示词
  -> 安全地向正文插入 pending tag
  -> 从已经落盘的 tag 重新读取实际提示词
  -> 调用目标生图后端
  -> 再次校验聊天、楼层、swipe 和 tag 是否仍匹配
  -> 保存图片结果并刷新对应楼层显示
```

将 tag 先写入、再开始生图有几个好处：

- 用户可以看到任务已经排队，而不是长时间没有反馈。
- 生图阶段使用的内容来自正式 tag，而不是 AI 返回但尚未落盘的临时对象。
- 生成期间 tag 被修改或删除时，可以通过提示词哈希发现冲突。

## 4. 上下文构成

### 4.1 最近正文

默认携带最近两个 AI 故事楼及其间 user 楼，数量可由用户调整，不另设字符上限。

最新 AI 楼层始终单独标明，因为模型必须围绕它判断本次是否需要生图，而不是为历史内容补图。

建议给独立 AI 的正文结构包含：

- 角色（user / assistant / system）。
- 发言者名称。
- 按柏宝书 `cleanBody` 口径清洗后的历史正文，并保留历史 `<bbi_image>`。
- 明确标记哪一层是本次目标楼层。
- 目标正文删除同款噪声和时间标签，并仅在保留的非空物理行末尾追加 `⟦P编号⟧`。

### 4.2 柏宝书状态快照

柏宝书的状态注入位置是动态的：

- 最新 AI 楼层已有有效摘要时，状态已经包含最新楼层，对应 D1。
- 最新 AI 楼层尚无有效摘要时，状态不包含最新楼层，对应 D2。

柏宝绘不应固定读取 `before latest`，而应：

1. 通过柏宝书公共 API 获取最新楼层信息。
2. 使用 `memory.valid` 判断当前状态属于 D1 还是 D2 语义。
3. 获取柏宝书当前有效快照。
4. 将快照的时间关系明确告诉独立 AI：
   - `after_latest`：快照已经包含目标楼层。
   - `before_latest`：快照是目标楼层发生之前的状态，目标正文会在其基础上产生变化。

即使是 D1，仍然需要发送最新正文。状态快照负责提供稳定的角色、场景和物品信息，原文负责提供具体画面和插入位置，二者作用不同。

读取楼层信息与快照时应检查柏宝书的 `revision`。若读取期间柏宝书刚好完成摘要并改变 revision，应重新读取一次，避免将 D1/D2 标记和不同时刻的快照拼在一起。

### 4.3 柏宝书不可用时

柏宝书属于增强记忆源，不应成为自动生图的硬依赖。

- API 不存在、版本不兼容或读取失败时，退回最近 N 个 AI 故事楼及其间 user 楼的正文。
- 在日志或任务详情中记录此次未使用柏宝书状态。
- 不应因为记忆源缺失而阻止用户手动生图。

## 5. 独立 AI 请求

### 5.1 请求职责

独立 AI 只负责：

- 判断是否值得生成图片。
- 选择画面。
- 返回目标正文中的段尾位置 ID，指出画面应插在哪个原始物理行之后。
- 只生成不含质量词的正面内容提示词。

它不负责：

- 重写整段正文。
- 直接生成最终消息文本。
- 生成质量词或负面提示词。
- 决定实际工作流节点或向 ComfyUI 发请求。

### 5.2 建议输出结构

```json
{
  "images": [
    {
      "position": "P2",
      "tag": "1girl, opening_a_door, moonlit_abandoned_hall, cinematic_lighting",
      "nl": "A girl opens a door into an abandoned hall lit by cold moonlight."
    }
  ]
}
```

约束：

- `position` 必须是目标正文段尾已提供的 `P编号`，不得引用历史上下文或自行编造。
- 插件把位置 ID 映射回清洗前的原始物理行，并在该行之后插入 tag。
- `tag` 是 danbooru 短 tag，必填；只包含正面画面内容，不包含质量词、负面词或 `<bbi_image>`/`<tag>`/`<nl>` 标签。
- `nl` 是自然语言部分，仅在「默认后端为 ComfyUI 且开启生成自然语言」时要求输出；与 `tag` 描述同一画面、互补不重复。未开启时协议里不出现该键。
- 返回图片数不得超过用户设置的单楼最大值。
- 插件仍需在本地再次截断数组，不能只依赖提示词约束。
- 不需要图片时返回 `{"images":[]}`。

如果位置 ID 不存在、格式错误或 `tag` 为空，整次响应校验失败，不写入正文；`nl` 缺失宽容降级为纯 tag。

### 5.3 可自定义提示词

至少拆分以下配置：

- 系统职责提示词：定义判断标准、输出格式和安全边界。
- 生图提示词规则：定义目标画风、tag 语言、角色一致性要求等。
- 规范选择与出图渠道解耦（本 fork）：`promptStyle` 决定用哪套规范（ComfyUI 单串 / NAI Base+Character），默认跟随渠道；详见 §0.1。
- 破限/附加提示词：由用户自行填写，可以关闭。
- 输出格式约束：通常由插件维护，不建议用户完全删除。

用户自定义内容与插件的结构化输出约束应分层拼装，避免用户修改画风要求时意外破坏 JSON 协议。

## 6. 生图 tag

### 6.1 推荐形态

推荐使用插件独占的成对标签，而不是复用 ST 宏或工作流占位符。tag 部分保持裸文本，自然语言部分包 `<nl>` 子标签：

```text
<bbi_image>1girl, opening_a_door, moonlit_abandoned_hall</bbi_image>
<bbi_image>1girl, opening_a_door<nl>A girl opens a door into an abandoned hall.</nl></bbi_image>
```

解析是一条容忍式规则（src/st/imageTagRegex.ts 的 `parseImageTagContent`）：`<nl>` 子标签内容为自然语言部分；显式 `<tag>` 子标签内容或剔除子标签后的裸文本为 tag 部分；裸文本与 `<tag>` 同时存在时合并不丢内容。无论采用何种内部格式，都应满足：

- 不包含 ID 或其他属性。
- 标签内部只有用户可直接修改的正面内容提示词。
- 质量词与负面词由用户直接写在 ComfyUI 工作流里（如 `质量词, %prompt%`），不经插件面板拼接。
- 支持提示词中出现普通逗号、换行和常见符号。
- 能完整识别并删除整个块。
- 不与 ST 的宏替换语法、ComfyUI 工作流占位符混用。

ComfyUI 工作流内继续使用 `%prompt%`、`%negative_prompt%`、`%seed%`、`%nl%` 占位符；正文 tag 是另一个层次的协议。`%nl%` 只写入显式声明它的工作流，不会自动拼进 `%prompt%`。

### 6.2 ST 托管隐藏正则

插件启动时向 `extension_settings.regex` 幂等注册一条固定 ID 的正则：

```text
/<bbi_image>[\s\S]+?<\/bbi_image>/gi
```

它整块删除 `<bbi_image>...</bbi_image>` 及其内部提示词，因此聊天显示和发送给主模型的后端提示词都不会包含生图内容。`[\s\S]+?` 用于兼容跨行提示词，非贪婪量词确保多个 tag 分别匹配。规则同时设置：

- `markdownOnly: true`：勾选“仅影响显示”。
- `promptOnly: true`：勾选“仅影响后端提示词”。
- `runOnEdit: true`：编辑预览同样生效。
- placement 覆盖 MD display、user input 与 AI output，兼容 ST 新旧正则口径。

两个 only 开关可以同时启用，ST 会分别在显示路径和后端提示词路径执行它。规则使用固定 ID 更新，不重复添加，也不改动用户的其他正则。

### 6.3 tag 生命周期

每个 tag 至少具有以下逻辑状态：

- `pending`：已经插入正文，等待生图。
- `generating`：后端正在执行。
- `ready`：存在与当前提示词匹配的图片。
- `stale`：tag 已修改，现有图片来自旧提示词。
- `error`：解析、请求或后端执行失败。
- `cancelled`：用户取消或所属消息状态发生变化。

状态不必全部写进正文；正文只保存提示词，瞬时状态及结果保存在扩展数据中。

### 6.4 编辑行为

- 修改提示词：计算新哈希；与结果中的 `promptHash` 不同则标记 `stale`。
- 移动整个 tag：只改变图片位置，不重新生成。
- 删除 tag：停止显示该 tag 的结果；正在执行的任务尽可能取消。
- 复制 tag：按新的出现顺序视为另一个 tag；同文提示词用出现序号区分。
- tag 格式损坏：原位显示解析错误，不提交后端。
- 修改后重新生成：默认由用户点击单 tag 的“重新生成”按钮，避免一次普通编辑自动产生费用。
- 自动重新生成：可以作为明确的可选设置，默认关闭。

### 6.5 生成期间发生编辑

开始生图时记录：

- chatId
- floor
- swipeId
- tag 在当前 swipe 中的出现序号
- promptHash

图片返回时再次读取正文中的 tag：

- tag 已删除：不挂载结果。
- tag 内容已变化：不得把旧提示词生成的图片标成当前结果；可以保存为历史结果或丢弃。
- 已切换聊天或 swipe：任务只能写回原目标，无法可靠写回时应取消，不能误挂到当前消息。

## 7. 正文写入安全

正文写入参考 ST-BaiBai-Pen 的事务式思路：

1. 任务开始时保存原始正文和 chatId。
2. 写入前优先读取正在打开的 ST 编辑器内容。
3. 当前正文与预期正文不一致时停止写入。
4. 同时更新 `message.mes` 和当前 `message.swipes[swipe_id]`。
5. 保存失败时回滚两处内容。
6. 同步当前编辑器或刷新楼层。
7. 发送正确的消息编辑/更新事件。

不要在旧正文上计算字符串位置后直接写回，否则独立 AI 请求期间用户的编辑可能被覆盖。

首次插入多个 tag 时，应先验证所有位置 ID 并一次性构造新正文，避免连续保存导致中间状态以及重复触发其他插件。

## 8. 图片结果存储与渲染

建议以当前 swipe 为边界保存结果，示意结构如下：

```ts
interface BaiBaiImageMessageData {
  version: 1;
  results: Array<{
    promptHash: string;
    images: Array<{
      url: string;
      seed?: number;
      backend: 'comfyui' | 'nai' | 'webui';
      createdAt: number;
    }>;
    selectedIndex: number;
    error?: string;
  }>;
}
```

实际落盘时应确认 ST 当前版本对 `message.extra` 与 `swipe_info[swipe_id].extra` 的同步行为，确保切换 swipe 后不会串图。

### 8.1 显示位置

渲染器扫描当前原始消息中的合法 tag，并把它转换为可交互的生图块：

- 可折叠查看或编辑提示词。
- 显示等待、生成中、失败或过期状态。
- 显示当前图片及历史图片切换。
- 提供重新生成、取消、删除结果等操作。

如果使用 ST 原生 `message.extra.media`，图片只能统一出现在楼层媒体区域。要实现多个 tag 分别位于不同段落之后，需要自定义 tag 渲染层；原生 media 可以用于文件持久化或楼层底部模式，但不能单独解决段落级定位。

### 8.2 不在正文中保存图片数据

正文中只保留可编辑 tag，不写入：

- Base64 图片。
- 临时 Blob URL。
- 完整 ComfyUI 工作流。
- 大段生成元数据。

图片应先保存为可持久访问的文件，再按当前 swipe、tag 出现序号和提示词哈希关联。页面刷新、重载聊天和切换设备后的可用性需要单独验证。

## 9. 与柏宝书的兼容

正文内 tag 会触发消息编辑事件，也可能进入摘要、向量召回和状态分析，因此需要正式的跨插件约定。

### 9.1 内容清洗

柏宝书应把 `<bbi_image>...</bbi_image>` 视为非剧情块，在以下入口中整块剔除：

- 自动摘要输入。
- `cleanBody()` 返回值。
- 向量入库和召回文本。
- 公共 API 返回的正文清洗结果。

不建议柏宝绘静默修改用户的“自定义清洗标签”配置。更稳定的方式是：

- 柏宝书内置忽略柏宝绘标签；或
- 柏宝书提供公共 API，允许其他插件注册需要忽略的块标签。

### 9.2 摘要失效判断

只修改生图 tag 不应使剧情摘要失效。

柏宝书处理 `MESSAGE_EDITED` 时，理想规则是比较清洗后的剧情正文：

- 清洗后正文相同：只有装饰性 tag 变化，保留摘要。
- 清洗后正文不同：用户确实修改了剧情，正常清理失效链并重新计算。

如果用户同时修改正文和 tag，仍应按剧情正文发生变化处理。

在该兼容能力完成前，正文 tag 编辑可能导致柏宝书摘要重算；实现柏宝绘自动链路前需要明确解决或至少向用户提示这一行为。

## 10. ComfyUI 适配

ComfyUI 使用 `Save (API Format)` 导出的完整工作流 JSON。插件不需要让用户手工维护节点映射，只需要让用户在工作流中放置动态占位符：

- `%prompt%`（tag 部分）
- `%negative_prompt%`
- `%seed%`
- `%nl%`（自然语言部分；工作流不含该占位符时自然语言不参与生成，不会拼进 `%prompt%`）

提交前：

1. 解析工作流 JSON。
2. 验证它是 API 格式节点对象。
3. 验证存在 `%prompt%`。
4. 替换受支持的占位符。
5. 拒绝未知占位符，避免用户误以为它们已经生效。
6. 将渲染后的完整工作流提交给 ComfyUI。

节点映射只有在插件需要自动识别并修改没有占位符的任意工作流时才有意义。当前采用工作流模板占位符后，不需要额外节点映射 UI。

## 11. 建议设置项

### 自动分析

- 总开关。
- 自动处理新 AI 楼层。
- 携带最近 AI 楼数，默认 2，目标楼计入数量，中间 user 楼一并携带，无字符上限。
- 是否使用柏宝书状态。
- 单楼最大图片数。

### AI 提示词

- 系统职责提示词。
- 生图 tag 编写规则。
- 破限/附加提示词。
- 使用的独立 API 渠道。

### tag 与重新生成

- 默认显示 tag / 折叠 tag / 隐藏 tag 但保留编辑入口。
- tag 修改后自动重新生成，默认关闭。
- 是否保留旧图片历史。
- 删除 tag 时是否同时删除图片文件。

### 生图后端

- 默认后端。
- 提示词规范选择（本 fork）：`promptStyle`（auto / comfyui / nai）与出图渠道解耦；`comfySpecNl` 在非 ComfyUI 后端走 ComfyUI 规范时独立控制 nl；详见 §0.1。
- ComfyUI 地址与请求方式。
- ComfyUI API 工作流 JSON。
- 后续 NAI / WebUI 各自配置。

## 12. 并发、幂等与错误处理

### 12.1 任务身份

每个任务至少由以下信息唯一标识：

```text
chatId + floor + swipeId + tag出现序号 + promptHash
```

相同身份的任务不得重复提交。重新生成时 promptHash、任务序号或显式 generationId 必须变化。

### 12.2 必须防止的错误

- 独立请求返回时用户已经切换聊天。
- 用户在分析期间编辑了目标正文。
- 用户在生图期间切换了 swipe。
- tag 被删除、复制或修改。
- 同一消息渲染事件重复触发自动分析。
- 页面重载后把旧的 pending 状态再次提交。
- 图片生成成功但聊天保存失败。
- 多张图完成顺序不同导致结果错绑。

### 12.3 推荐策略

- 使用 AbortController 管理可取消的网络任务。
- 每个阶段重新验证任务身份。
- 持久状态与瞬时运行状态分开。
- 自动触发使用正文清洗后的 sourceHash 去重；计算时排除柏宝绘自身 tag，避免插入 tag 后再次触发整楼分析。
- 失败保留可读错误和“重试”入口，不无限自动重试付费请求。

## 13. 推荐实施顺序

### 阶段一：独立 AI 自动插入 tag（已完成首版）

- 监听新 AI 正文完成事件。
- 拼装清洗后的最近 N 个 AI 故事楼及其间 user 楼和 D1/D2 柏宝书快照。
- 发送带段尾位置 ID 的目标正文并要求模型返回位置 ID JSON。
- 校验位置 ID、提示词和最大数量后安全写回正文。

### 阶段二：单 tag 生图闭环

- 解析 `<bbi_image>提示词</bbi_image>`。
- 从 tag 调用已完成的 ComfyUI 适配。
- 将结果保存并显示在 tag 位置。
- 支持修改 tag 后手动重新生成。

### 阶段三：tag 编辑与任务状态

- 完成删除、移动、复制和损坏 tag 的处理。
- 完成过期图片、取消、重试和历史图片。

### 阶段四：柏宝书兼容

- 按 D1/D2 语义读取当前状态快照（已完成首版）。
- 完成柏宝书对 `<bbi_image>` 块的清洗。
- 避免纯 tag 修改导致剧情摘要失效。

### 阶段五：体验与其他后端

- 任务队列、取消、重试和历史图片。
- NAI / WebUI 适配。
- 重做正式 UI。

## 14. 尚待确认的设计项

以下内容在编码前仍需要最终决定：

1. tag 是否默认展开显示提示词。
2. 旧图片是保留为历史、立即替换，还是由用户选择。
3. 删除 tag 时是否删除服务器上的图片文件。
4. 是否需要允许同一个 tag 同时生成多张批次图片。
5. 柏宝书兼容采用内置标签、注册清洗器 API，还是两者同时提供。
6. 自动任务在用户切换 swipe 后是取消，还是允许写回原 swipe。

这些项目不影响“正文 tag 是提示词与位置真源、图片结果保存在扩展数据中”的总体方向。
