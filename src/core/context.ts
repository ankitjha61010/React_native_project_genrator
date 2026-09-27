import { ARCHITECTURES, getArchitecture } from '../architectures/index.js';
import { STATE_MANAGEMENT_LABELS } from '../config/constants.js';
import { getProfile } from '../config/compatibility.js';
import { allPlannedPaths, createPlan, importAliases } from './plan.js';
import { renderTree } from './tree.js';
import type { GenerationPlan, GroupId, ProjectOptions, RenderContext } from './types.js';

export interface PreparedGeneration {
  ctx: RenderContext;
  plan: GenerationPlan;
}

function toVarName(id: string): string {
  return id.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();
}

/** The tree shown in previews and docs: directories under `src/`. */
export function architectureTree(plan: GenerationPlan, maxDepth = 4): string {
  const srcPaths = allPlannedPaths(plan)
    .filter(p => p.startsWith('src/'))
    .map(p => p.slice('src/'.length));
  return renderTree('src', srcPaths, { directoriesOnly: true, maxDepth });
}

function architectureDocs(plan: GenerationPlan): { concepts: string; rules: string } {
  const { docs } = plan.architecture;
  const concepts = docs.concepts.map(c => `### ${c.title}\n\n${c.body}`).join('\n\n');
  const r = docs.rules;
  const rules = [
    '| Question | Answer |',
    '| --- | --- |',
    `| Where do UI components belong? | ${r.uiComponents} |`,
    `| Where does business logic belong? | ${r.businessLogic} |`,
    `| Where do API calls belong? | ${r.apiCalls} |`,
    `| Where does state belong? | ${r.state} |`,
    `| Where does navigation belong? | ${r.navigation} |`,
  ].join('\n');
  return { concepts, rules };
}

/** Builds the render context + file plan for a set of options. */
export function prepareGeneration(options: ProjectOptions): PreparedGeneration {
  const architecture = getArchitecture(options.architecture);
  const profile = getProfile(options.reactNativeVersion);
  const sm = options.stateManagement;

  const flags: Record<string, boolean> = {
    STATE_REDUX: sm === 'redux',
    STATE_ZUSTAND: sm === 'zustand',
    STATE_CONTEXT: sm === 'context',
    STATE_NONE: sm === 'none',
    HAS_STORE: sm !== 'none',
    FIREBASE_ANDROID_CONFIGURED: Boolean(options.firebase.androidConfigPath),
    FIREBASE_IOS_CONFIGURED: Boolean(options.firebase.iosConfigPath),
    API_ENCRYPTION: options.apiEncryption,
    RTL: options.rtl,
    THEME_CONTEXT: options.themeContext,
    VECTOR_ICONS: options.vectorIcons,
    NOTIFICATIONS: options.notifications,
    ANALYTICS: options.analytics,
    STORAGE_MMKV: options.storage === 'mmkv',
    STORAGE_ASYNC: options.storage === 'async-storage',
    AUTH_EMAIL: options.authEmail,
    AUTH_MOBILE: options.authMobile,
    SOCIAL_GOOGLE: options.socialAuth === 'google' || options.socialAuth === 'both',
    SOCIAL_FACEBOOK: options.socialAuth === 'facebook' || options.socialAuth === 'both',
    HAS_SOCIAL_AUTH: options.socialAuth !== 'none',
    SOCKET: options.socket,
    CHAT: options.chat,
  };
  for (const a of ARCHITECTURES) {
    flags[`ARCH_${toVarName(a.id)}`] = a.id === architecture.id;
  }

  const variables: Record<string, string> = {
    APP_NAME: options.appName,
    DISPLAY_NAME: options.displayName,
    PACKAGE_NAME: options.packageName,
    APP_SLUG: options.appName.toLowerCase(),
    ARCHITECTURE_ID: architecture.id,
    ARCHITECTURE_NAME: architecture.name,
    ARCHITECTURE_SUMMARY: architecture.summary,
    STATE_MANAGEMENT_NAME: STATE_MANAGEMENT_LABELS[sm],
    RN_VERSION: profile.reactNative,
    REACT_VERSION: profile.react,
  };

  const ctx: RenderContext = { options, architecture, variables, flags };
  const plan = createPlan(architecture, ctx);

  // Paths for docs: PATH_<FILE_ID> and DIR_<GROUP>.
  for (const file of plan.files) {
    variables[`PATH_${toVarName(file.id)}`] = file.path;
  }
  for (const [group, dir] of Object.entries(architecture.groups) as Array<[GroupId, string]>) {
    variables[`DIR_${toVarName(group)}`] = dir;
  }
  const docs = architectureDocs(plan);
  variables.ARCHITECTURE_TREE = architectureTree(plan, 6);
  variables.ARCHITECTURE_CONCEPTS = docs.concepts;
  variables.ARCHITECTURE_RULES = docs.rules;

  // Import aliases (babel.config.js, tsconfig.json, docs).
  const aliases = importAliases(plan);
  variables.BABEL_ALIASES = aliases.map(a => `          '${a.alias}': '${a.dir}',`).join('\n');
  variables.TSCONFIG_PATHS = aliases
    .flatMap(a => [`      "${a.alias}": ["${a.dir}"]`, `      "${a.alias}/*": ["${a.dir}/*"]`])
    .join(',\n');
  variables.ALIAS_TABLE = aliases.map(a => `| \`${a.alias}/…\` | \`${a.dir.slice(2)}/…\` |`).join('\n');

  return { ctx, plan };
}
