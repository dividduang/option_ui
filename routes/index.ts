import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'Option',
    path: '/option',
    component: () => import('#/plugins/option/views/index.vue'),
    meta: {
      icon: 'ant-design:setting-outlined',
      title: $t('option.menu'),
    },
  },
];

export default routes;
