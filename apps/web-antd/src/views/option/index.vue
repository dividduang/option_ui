<script lang="ts" setup>
import type { ConfigItem } from './types';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import { useClipboard } from '@vueuse/core';
import { message, Modal } from 'ant-design-vue';

import {
  deleteConfigByIdApi,
  getApiKeyById,
  getConfigByApiKey,
  getConfigInfoApi,
} from '#/api/option';
import { generateAccess } from '#/router/access';
import { accessRoutes } from '#/router/routes';

import { OptionForm } from './components';

// 设置元数据，只使用核心路由中的配置
defineOptions({
  name: 'Option',
});

const configList = ref<ConfigItem[]>([]);
const isModalVisible = ref(false);
const loading = ref(false);
const errorMsg = ref<null | string>(null);
const { copy } = useClipboard({ legacy: true });
const editingConfig = ref<ConfigItem | null>(null);
const configData = ref<null | Record<string, string>>(null);
const currentApiKey = ref<null | string>(null);
const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();
const menuInitialized = ref(false); // 跟踪菜单是否已初始化

// 手动确保菜单加载，但只执行一次
const ensureMenuLoaded = async () => {
  // 如果已经初始化过或已经有菜单数据，直接返回
  if (
    menuInitialized.value ||
    (accessStore.accessMenus && accessStore.accessMenus.length > 0)
  ) {
    return;
  }

  menuInitialized.value = true; // 标记为已初始化，防止重复执行

  try {
    // 获取用户信息（如果需要）
    let userRoles: string[] = [];
    if (userStore.userInfo) {
      userRoles = userStore.userInfo.roles || [];
    }

    // 使用generateAccess生成菜单
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      routes: accessRoutes,
    });

    // 设置菜单和路由
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);
  } catch {
    menuInitialized.value = false; // 如果失败，重置标记以便下次重试
  }
};

// 获取配置列表
const fetchConfigList = async () => {
  try {
    loading.value = true;
    errorMsg.value = null;

    const res = await getConfigInfoApi();

    // 处理响应数据，兼容不同的返回格式
    if (res?.data?.configs) {
      // 标准格式，直接使用
      configList.value = res.data.configs;
    } else if (res?.configs) {
      // 备选格式1，configs在顶层
      configList.value = res.configs;
    } else if (res?.data?.data?.configs) {
      // 备选格式2，configs在data.data中
      configList.value = res.data.data.configs;
    } else if (res?.data) {
      // 如果有data但没有预期的结构，尝试检查是否为直接的configs数组
      const dataObj = res.data;
      if (Array.isArray(dataObj)) {
        configList.value = dataObj;
      } else if (dataObj.code === 200 && dataObj.data && dataObj.data.configs) {
        // 处理嵌套在一层data中的情况
        configList.value = dataObj.data.configs;
      } else {
        configList.value = [];
      }
    } else {
      configList.value = [];
    }

    if (configList.value.length === 0) {
      // do nothing
    }
  } catch (error: any) {
    console.error('获取配置列表失败', error);
    console.error('错误详情:', error?.response || error?.message || error);
    errorMsg.value = error?.message || '获取配置列表失败，请检查API接口实现';
    message.error('获取配置列表失败');
  } finally {
    loading.value = false;
  }
};

// 复制API Key
const handleCopyApiKey = async (item: ConfigItem) => {
  try {
    loading.value = true;
    const res = await getApiKeyById(item.api_key_id);
    // 使用类型断言处理不同响应结构
    interface ResponseWithData {
      data: any;
      code?: number;
      msg?: string;
    }
    const response = res as ResponseWithData;
    let apiKey: null | string = null;

    if (response && typeof response.data === 'string') {
      // 直接是字符串
      apiKey = response.data;
    } else if (response.data && typeof response.data === 'object') {
      const nestedData = response.data as ResponseWithData;

      if (typeof nestedData.data === 'string') {
        // 嵌套格式: { data: { data: 'string' } }
        apiKey = nestedData.data;
      } else if (nestedData.code === 200 && nestedData.data) {
        // 两层嵌套带状态码: { data: { code: 200, data: 'string' } }
        apiKey = typeof nestedData.data === 'string' ? nestedData.data : null;
      }
    }

    if (apiKey) {
      await copy(apiKey);
      message.success('API Key已复制到剪贴板');
    } else {
      throw new Error('无法从响应中获取有效的API Key');
    }
  } catch (error: any) {
    console.error('复制API Key失败', error);
    message.error(error?.message || '复制失败');
  } finally {
    loading.value = false;
  }
};

// 编辑配置
const handleEditConfig = async (item: ConfigItem) => {
  try {
    loading.value = true;
    editingConfig.value = item;
    currentApiKey.value = null;

    // 获取该配置的详细配置数据
    const res = await getApiKeyById(item.api_key_id);

    // 处理不同的响应格式，获取API Key
    interface ResponseWithData {
      data: any;
      code?: number;
      msg?: string;
    }

    const response = res as ResponseWithData;
    let apiKey: null | string = null;

    if (response && typeof response.data === 'string') {
      apiKey = response.data;
    } else if (response.data && typeof response.data === 'object') {
      const nestedData = response.data as ResponseWithData;
      if (typeof nestedData.data === 'string') {
        apiKey = nestedData.data;
      } else if (nestedData.code === 200 && nestedData.data) {
        apiKey = typeof nestedData.data === 'string' ? nestedData.data : null;
      }
    }

    if (apiKey) {
      // 保存API Key以便编辑时使用
      currentApiKey.value = apiKey;

      // 使用获取到的API Key获取配置数据
      const configRes = await getConfigByApiKey(apiKey);

      // 处理不同的配置数据响应格式
      let configDataObj: null | Record<string, string> = null;
      const configResponse = configRes as ResponseWithData;

      if (configResponse.data && configResponse.data.config_data) {
        // 标准格式: { data: { config_data: {...} } }
        configDataObj = configResponse.data.config_data;
      } else if (
        configResponse.data &&
        typeof configResponse.data === 'object'
      ) {
        interface ConfigDataResponse {
          data?: any;
          config_data?: Record<string, string>;
        }

        const configNestedData = configResponse.data as ConfigDataResponse;

        if (configNestedData.data && configNestedData.data.config_data) {
          // 嵌套格式: { data: { data: { config_data: {...} } } }
          configDataObj = configNestedData.data.config_data;
        } else if (configNestedData.config_data) {
          // 简单嵌套: { data: { config_data: {...} } }
          configDataObj = configNestedData.config_data;
        }
      }

      if (configDataObj) {
        configData.value = configDataObj;
        isModalVisible.value = true;
      } else {
        throw new Error('无法获取配置数据，响应格式不符合预期');
      }
    } else {
      throw new Error('无法获取API Key');
    }
  } catch (error: any) {
    console.error('获取配置数据失败', error);
    message.error(error?.message || '获取配置数据失败');
    editingConfig.value = null;
    configData.value = null;
    currentApiKey.value = null;
  } finally {
    loading.value = false;
  }
};

// 打开新增配置的模态框
const openAddModal = () => {
  editingConfig.value = null;
  configData.value = null;
  currentApiKey.value = null;
  isModalVisible.value = true;
};

// 关闭模态框
const closeModal = () => {
  isModalVisible.value = false;
  editingConfig.value = null;
  configData.value = null;
  currentApiKey.value = null;
};

// 添加或编辑成功后回调
const onFormSuccess = () => {
  closeModal();
  fetchConfigList();
  message.success(editingConfig.value ? '配置更新成功' : '配置创建成功');
};

// 删除配置
const handleDeleteConfig = (item: ConfigItem) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除 "${item.api_key.name}" 配置吗？此操作不可恢复。`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        loading.value = true;
        const res = await deleteConfigByIdApi(item.api_key_id);

        // 判断不同的响应格式
        if (
          res &&
          (res.code === 200 ||
            res.status === 200 ||
            (res.data && res.data.code === 200))
        ) {
          message.success('删除成功');
          fetchConfigList();
        } else {
          const errorMsg =
            res?.msg || res?.data?.msg || '删除失败，请检查配置项ID是否正确';
          throw new Error(errorMsg);
        }
      } catch (error: any) {
        console.error('删除失败', error);
        message.error(error?.message || '删除失败');
      } finally {
        loading.value = false;
      }
    },
  });
};

onMounted(() => {
  // 确保菜单加载，但仅在需要时执行一次
  ensureMenuLoaded();
  // 获取配置列表
  fetchConfigList();
});
</script>

<template>
  <div class="option-container">
    <div class="option-header">
      <h1>密文管理Plus</h1>
      <a-button type="primary" @click="openAddModal">
        <template #icon><i class="icon-ant-design:plus-outlined"></i></template>
        添加配置
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <div class="option-content">
        <div v-if="errorMsg" class="error-container">
          <a-alert type="error" :message="errorMsg" show-icon />
          <div class="error-action">
            <a-button type="primary" @click="fetchConfigList">重试</a-button>
          </div>
        </div>
        <div v-else-if="configList.length === 0" class="empty-data">
          <a-empty description="暂无配置数据，请点击'添加配置'按钮创建" />
        </div>
        <div v-else class="option-card-list">
          <a-card
            v-for="item in configList"
            :key="item.api_key_id"
            class="option-card"
            :bordered="false"
            :hoverable="true"
          >
            <template #title>
              <div class="card-title">
                <span>{{ item.api_key.name }}</span>
              </div>
            </template>
            <template #extra>
              <div class="card-actions">
                <button class="option-btn copy" @click="handleCopyApiKey(item)">
                  复制
                </button>
                <button class="option-btn edit" @click="handleEditConfig(item)">
                  编辑
                </button>
                <button
                  class="option-btn delete"
                  @click="handleDeleteConfig(item)"
                >
                  删除
                </button>
              </div>
            </template>
            <div class="card-content">
              <div class="key-info">
                <div class="info-item">
                  <span class="info-label">创建时间:</span>
                  <span>{{
                    new Date(item.api_key.created_time).toLocaleString(
                      'zh-CN',
                      {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )
                  }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">最后使用时间:</span>
                  <span>{{
                    item.api_key.last_used_time
                      ? new Date(item.api_key.last_used_time).toLocaleString(
                          'zh-CN',
                          {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )
                      : '从未使用'
                  }}</span>
                </div>
              </div>
            </div>
          </a-card>
        </div>
      </div>
    </a-spin>

    <!-- 添加配置的模态框 -->
    <a-modal
      v-model:open="isModalVisible"
      :title="editingConfig ? '编辑配置' : '添加配置'"
      :width="1200"
      :mask-closable="false"
      :footer="null"
    >
      <OptionForm
        @success="onFormSuccess"
        @cancel="closeModal"
        :config-data="configData"
        :edit-name="editingConfig?.api_key.name"
        :api-key="currentApiKey || undefined"
      />
    </a-modal>
  </div>
</template>

<style lang="less" scoped>
.option-container {
  padding: 24px;
  background-color: #f5f7fa;
  height: 100%;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    font-size: 24px;
    margin: 0;
  }
}

.option-content {
  min-height: 300px;
}

.option-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}

.option-card {
  background: linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  width: 100%;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    font-weight: 600;
    font-size: 16px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.card-content {
  padding: 8px 0;
}

.key-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-label {
  width: 100px;
  color: #5c6b77;
}

.empty-data {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.error-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.error-action {
  margin-top: 16px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.option-btn {
  padding: 4px 18px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  margin-right: 8px;
  background: #f0f2f5;
  color: #333;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
  letter-spacing: 2px;
}
.option-btn:last-child {
  margin-right: 0;
}
.option-btn.copy {
  background: #e6f7ff;
  color: #1890ff;
}
.option-btn.copy:hover {
  background: #bae7ff;
}
.option-btn.edit {
  background: #fffbe6;
  color: #faad14;
}
.option-btn.edit:hover {
  background: #ffe58f;
}
.option-btn.delete {
  background: #fff1f0;
  color: #ff4d4f;
}
.option-btn.delete:hover {
  background: #ffa39e;
}
</style>
