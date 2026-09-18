import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 提示词规范(promptStyle)与出图渠道解耦后的存量与脏数据处理。
 *
 * 纯加法迁移:老配置没有这两个键,hydrate 后必须回落
 * 'auto'(跟随出图渠道)/ false,保证升级后自动 tag 的提示词逐字节不变。
 * 写坏的取值也回落默认——normalize 之后不允许残留第三态,
 * 下游(effectivePromptStyle / 面板)不必再判 undefined。
 */

const mocks = vi.hoisted(() => ({
  context: null as Record<string, any> | null,
}));

vi.mock('@/st/context', () => ({
  getContext: () => mocks.context,
}));

async function hydrateWith(autoTag: Record<string, unknown>) {
  mocks.context = {
    extensionSettings: { baibai_image: { autoTag } },
    saveSettingsDebounced: vi.fn(),
  };
  const { hydrateSettings, settings } = await import('@/state/settings');
  await hydrateSettings();
  return settings;
}

describe('提示词规范与出图渠道解耦', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('toastr', { info: vi.fn(), success: vi.fn(), error: vi.fn() });
    vi.stubGlobal('window', { addEventListener: vi.fn(), dispatchEvent: vi.fn() });
  });

  it('存量配置没有这两个键 → auto + false,升级后提示词零变化', async () => {
    const settings = await hydrateWith({ enabled: true });
    expect(settings.autoTag.promptStyle).toBe('auto');
    expect(settings.autoTag.comfySpecNl).toBe(false);
  });

  it('显式存了取值 → 原样保留', async () => {
    const settings = await hydrateWith({ promptStyle: 'comfyui', comfySpecNl: true });
    expect(settings.autoTag.promptStyle).toBe('comfyui');
    expect(settings.autoTag.comfySpecNl).toBe(true);
  });

  it('promptStyle 写坏 → 回落 auto,不留第三态', async () => {
    const settings = await hydrateWith({ promptStyle: 'webui' });
    expect(settings.autoTag.promptStyle).toBe('auto');
  });

  it('comfySpecNl 写坏 → 回落 false', async () => {
    const settings = await hydrateWith({ comfySpecNl: 'yes' });
    expect(settings.autoTag.comfySpecNl).toBe(false);
  });

  it('存量配置没有 facelessMale → false(照常画脸),升级后行为不变', async () => {
    const settings = await hydrateWith({ enabled: true });
    expect(settings.autoTag.facelessMale).toBe(false);
  });

  it('facelessMale 写坏 → 回落 false', async () => {
    const settings = await hydrateWith({ facelessMale: 'on' });
    expect(settings.autoTag.facelessMale).toBe(false);
  });

  it('facelessMale 显式开启 → 原样保留', async () => {
    const settings = await hydrateWith({ facelessMale: true });
    expect(settings.autoTag.facelessMale).toBe(true);
  });
});
