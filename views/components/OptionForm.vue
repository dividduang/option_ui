<script lang="ts" setup>
import type { SaveConfigParams } from '#/plugins/option/api';

import { computed, reactive, ref, watch } from 'vue';

import { JsonViewer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { baseRequestClient } from '#/api/request';
import { saveConfigApi, updateConfigApi } from '#/plugins/option/api';

const props = defineProps<{
  apiKey?: string;
  configData?: null | Record<string, string>;
  editName?: string;
}>();

const emit = defineEmits(['success', 'cancel']);

interface ConfigField {
  key: string;
  value: string;
  id: number;
}

const formState = reactive({
  name: '',
  configFields: [
    { key: '账号', value: '', id: 1 },
    { key: '密码', value: '', id: 2 },
  ] as ConfigField[],
});

const loading = ref(false);
let fieldCounter = 2;

const aiEmailInput = ref('');
const aiConvertLoading = ref(false);

// 初始化表单数据
const initFormData = () => {
  // 设置名称
  if (props.editName) {
    formState.name = props.editName;
  }

  // 设置配置项
  if (props.configData) {
    // 清空现有字段
    formState.configFields = [];
    fieldCounter = 0;

    // 添加配置数据到表单
    Object.entries(props.configData).forEach(([key, value]) => {
      fieldCounter++;
      formState.configFields.push({
        key,
        value,
        id: fieldCounter,
      });
    });
  }
};

// 监听配置数据或名称变化
watch(
  [() => props.configData, () => props.editName],
  () => {
    initFormData();
  },
  { immediate: true },
);

// 添加配置字段
const addConfigField = () => {
  fieldCounter++;
  formState.configFields.push({
    key: '',
    value: '',
    id: fieldCounter,
  });
};

// 删除配置字段
const removeConfigField = (id: number) => {
  const index = formState.configFields.findIndex((field) => field.id === id);
  if (index !== -1) {
    formState.configFields.splice(index, 1);
  }
};

// 提交表单
const handleSubmit = async () => {
  // 表单验证
  if (!formState.name.trim()) {
    message.error('请输入配置名称');
    return;
  }

  // 构建配置数据
  const configData: Record<string, any> = {};
  for (const field of formState.configFields) {
    if (!field.key.trim()) {
      message.error('配置项名称不能为空');
      return;
    }
    let value = field.value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          value = JSON.parse(trimmed);
        } catch {
          message.error(`配置项【${field.key}】的值不是合法的列表格式`);
          return;
        }
      } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          value = JSON.parse(trimmed);
        } catch {
          message.error(`配置项【${field.key}】的值不是合法的字典格式`);
          return;
        }
      }
      configData[field.key] = value;
    } else {
      message.error(`配置项【${field.key}】的值不是合法字符串，请检查输入`);
      return;
    }
  }

  // 发送请求
  try {
    loading.value = true;

    // 判断是新增还是编辑模式
    if (props.apiKey) {
      // 编辑模式：使用updateConfigApi
      await updateConfigApi(props.apiKey, configData);
    } else {
      // 新增模式：使用saveConfigApi
      const params: SaveConfigParams = {
        name: formState.name,
        config_data: configData,
      };
      await saveConfigApi(params);
    }
  } catch (error: any) {
    const errorMsg = error?.response?.data?.msg || error?.message || '未知错误';
    message.error(`操作配置失败: ${errorMsg}`);
  } finally {
    loading.value = false;
  }
};

// 取消
const handleCancel = () => {
  emit('cancel');
};

const handleAiConvert = async () => {
  if (!aiEmailInput.value.trim()) {
    message.warning('请输入需要转换的内容');
    return;
  }
  aiConvertLoading.value = true;
  try {
    const url = 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = '*********************';
    const data = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的配置转换专家，请将用户输入的邮箱转换为配置项，配置项的格式为：
          ["abc@cn.wilmar-intl.com","def@cn.wilmar-intl.com"]
          例子：
          Liu Zheng Wei (刘正伟) <liuzhengwei@cn.wilmar-intl.com>; Yu Xin Yan (余新彦) <yuxinyan@cn.wilmar-intl.com>; Zhao Xin (赵鑫) <zhaoxin@cn.wilmar-intl.com>
          转换后为：
          ["liuzhengwei@cn.wilmar-intl.com","yuxinyan@cn.wilmar-intl.com","zhaoxin@cn.wilmar-intl.com"]
          强制约束：
          只需要回复list内容,不要回复其他内容`,
        },
        {
          role: 'user',
          content: aiEmailInput.value,
        },
      ],
    };
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    };
    const response = await baseRequestClient.post(url, data, config);
    // 假设返回格式为 { choices: [{ message: { content: 'xxx' } }] }
    const result = response.data?.choices?.[0]?.message?.content;
    if (result) {
      aiEmailInput.value = result;
      message.success('AI转换成功');
    } else {
      message.error('AI未返回有效内容');
    }
  } catch {
    message.error('AI转换失败');
  } finally {
    aiConvertLoading.value = false;
  }
};

const currentConfigJson = computed(() => {
  const config: Record<string, string> = {};
  formState.configFields.forEach((field) => {
    if (field.key.trim()) {
      config[field.key] = field.value;
    }
  });
  return config;
});
</script>

<template>
  <div class="ant-modal-content">
    <div class="option-form-flex">
      <div class="option-form-left">
        <a-form layout="vertical">
          <a-form-item label="配置名称" required>
            <a-input
              v-model:value="formState.name"
              placeholder="请输入配置名称"
              :max-length="50"
            />
          </a-form-item>

          <div class="ai-convert-section">
            <div class="section-header">
              <h3>AI 一键转换邮箱</h3>
            </div>
            <a-form-item>
              <a-textarea
                v-model:value="aiEmailInput"
                placeholder="请输入需要转换的内容"
                :auto-size="{ minRows: 4, maxRows: 8 }"
                style="font-size: 16px"
              />
            </a-form-item>
            <div class="ai-convert-actions">
              <a-button
                type="primary"
                style="min-width: 100px"
                :loading="aiConvertLoading"
                @click="handleAiConvert"
              >
                转换
              </a-button>
            </div>
          </div>

          <div class="config-fields-section">
            <div class="section-header">
              <h3>配置项</h3>
              <a-button
                type="primary"
                shape="round"
                size="small"
                class="add-field-btn"
                @click="addConfigField"
              >
                <template #icon>
                  <i class="icon-ant-design:plus-outlined"></i>
                </template>
                添加配置项
              </a-button>
            </div>

            <div class="config-fields">
              <div
                v-for="field in formState.configFields"
                :key="field.id"
                class="config-field-item"
              >
                <div class="field-inputs">
                  <a-form-item
                    class="key-input"
                    :label="field.id === 1 ? '名称' : ''"
                    :required="field.id === 1"
                  >
                    <a-input
                      v-model:value="field.key"
                      placeholder="配置项名称"
                      :max-length="30"
                    />
                  </a-form-item>
                  <a-form-item
                    class="value-input"
                    :label="field.id === 1 ? '值' : ''"
                    :required="field.id === 1"
                  >
                    <a-input
                      v-model:value="field.value"
                      placeholder="配置项值"
                    />
                  </a-form-item>
                </div>
                <div class="field-actions">
                  <a-button
                    v-if="formState.configFields.length > 2"
                    style="
                      color: white;
                      background-color: #ff4d4f;
                      border-color: #ff4d4f;
                    "
                    shape="circle"
                    class="delete-field-btn"
                    @click="removeConfigField(field.id)"
                  >
                    <template #icon>
                      <i class="icon-ant-design:delete-outlined"></i>
                    </template>
                  </a-button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <a-button @click="handleCancel">取消</a-button>
            <a-button
              type="primary"
              :loading="loading"
              @click="handleSubmit"
              class="save-btn"
            >
              保存
            </a-button>
          </div>
        </a-form>
      </div>
      <div class="option-form-right">
        <div class="json-viewer-header">当前配置 JSON</div>
        <JsonViewer :value="currentConfigJson" :expand-depth="3" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.option-form-flex {
  display: flex;
  gap: 24px;
  width: 100%;
  max-width: 1400px;
  min-width: 900px;
  margin: 0 auto;
}

.option-form-left {
  flex: 1 1 0;
  min-width: 400px;
}

.option-form-right {
  width: 400px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-width: 320px;
}

.json-viewer-header {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 12px;
}

.option-form {
  padding: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    margin: 0;
    font-size: 16px;
  }

  .add-field-btn {
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(24, 144, 255, 0.2);
    transition: all 0.3s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(24, 144, 255, 0.3);
    }
  }
}

.ai-convert-section {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 16px;
    }
  }

  .ai-convert-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
}

.config-fields-section {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.config-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-field-item {
  display: flex;
  align-items: flex-start;
  background-color: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
  }
}

.field-inputs {
  display: flex;
  flex: 1;
  gap: 16px;
}

.key-input {
  width: 40%;
  margin-bottom: 0;
}

.value-input {
  flex: 1;
  margin-bottom: 0;
}

.field-actions {
  display: flex;
  align-items: center;
  padding-top: 32px;
  margin-left: 8px;

  .delete-field-btn {
    box-shadow: 0 2px 4px rgba(245, 34, 45, 0.3);
    opacity: 1;
    transition: all 0.3s;

    &:hover {
      opacity: 1;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(245, 34, 45, 0.5);
    }
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;

  .save-btn {
    box-shadow: 0 2px 4px rgba(24, 144, 255, 0.2);
    min-width: 100px;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(24, 144, 255, 0.3);
    }
  }
}
</style>
