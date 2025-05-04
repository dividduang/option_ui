import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

// 使用空路由数组，因为我们已在core.ts中添加了option路由
// 这避免了路由冲突，并确保option在核心路由中定义
const routes: RouteRecordRaw[] = [];

export default routes; 