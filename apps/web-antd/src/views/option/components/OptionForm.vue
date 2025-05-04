<script lang="ts" setup>
import { ref, reactive, watch } from 'vue';
import { message } from 'ant-design-vue';
import { saveConfigApi, updateConfigApi } from '#/api/option';
import type { SaveConfigParams, ApiResponse } from '#/api/option';

const props = defineProps<{
  configData?: Record<string, string> | null;
  editName?: string;
  apiKey?: string;
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
watch([() => props.configData, () => props.editName], () => {
  initFormData();
}, { immediate: true });

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
  const index = formState.configFields.findIndex(field => field.id === id);
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
  const configData: Record<string, string> = {};
  for (const field of formState.configFields) {
    if (!field.key.trim()) {
      message.error('配置项名称不能为空');
      return;
    }
    configData[field.key] = field.value;
  }

  // 发送请求
  try {
    loading.value = true;
    
    let result;
    console.log('提交表单时间:', new Date().toISOString());
    
    // 判断是新增还是编辑模式
    if (props.apiKey) {
      // 编辑模式：使用updateConfigApi
      console.log('正在更新配置数据:', configData);
      console.log('使用API Key:', props.apiKey);
      result = await updateConfigApi(props.apiKey, configData);
    } else {
      // 新增模式：使用saveConfigApi
      const params: SaveConfigParams = {
        name: formState.name,
        config_data: configData,
      };
      console.log('正在创建新配置数据:', params);
      result = await saveConfigApi(params);
    }
    
    console.log('配置保存响应时间:', new Date().toISOString());
    console.log('配置保存原始响应:', result);
    
    // 处理不同的响应格式
    interface ResponseWithData {
      data?: any;
      code?: number;
      msg?: string;
      status?: number;
    }
    
    const response = result as ResponseWithData;
    let isSuccess = false;
    let apiKeyValue = '';
    
    // 检查顶层状态
    if (response.code === 200 || response.status === 200) {
      isSuccess = true;
      apiKeyValue = typeof response.data === 'string' ? response.data : '';
    } 
    // 检查嵌套在data中的状态
    else if (response.data) {
      const nestedData = response.data as ResponseWithData;
      if (nestedData.code === 200) {
        isSuccess = true;
        apiKeyValue = typeof nestedData.data === 'string' ? nestedData.data : '';
      }
    }
    
    if (isSuccess) {
      const action = props.apiKey ? '更新' : '创建';
      console.log(`${action}配置成功, API Key:`, apiKeyValue);
      // 显示成功消息
      setTimeout(() => {
        emit('success');
      }, 100);
    } else {
      // 尝试获取错误消息
      const errorMsg = response.msg || (response.data && (response.data.msg || '')) || '未知错误';
      console.error('操作失败, 错误信息:', errorMsg);
      throw new Error(`操作失败: ${errorMsg}`);
    }
  } catch (error: any) {
    console.error('操作配置失败, 完整错误:', error);
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
</script>

<template>
  <div class="option-form">
    <a-form layout="vertical">
      <a-form-item label="配置名称" required>
        <a-input 
          v-model:value="formState.name" 
          placeholder="请输入配置名称"
          :maxLength="50"
        />
      </a-form-item>

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
            <template #icon><i class="icon-ant-design:plus-outlined"></i></template>
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
              <a-form-item class="key-input" :label="field.id === 1 ? '名称' : ''" :required="field.id === 1">
                <a-input 
                  v-model:value="field.key" 
                  placeholder="配置项名称"
                  :maxLength="30"
                />
              </a-form-item>
              <a-form-item class="value-input" :label="field.id === 1 ? '值' : ''" :required="field.id === 1">
                <a-input 
                  v-model:value="field.value" 
                  placeholder="配置项值"
                  :maxLength="100"
                />
              </a-form-item>
            </div>
            <div class="field-actions">
              <a-button 
                v-if="formState.configFields.length > 2" 
                style="background-color: #ff4d4f; border-color: #ff4d4f; color: white;"
                shape="circle"
                class="delete-field-btn" 
                @click="removeConfigField(field.id)"
              >
                <template #icon><i class="icon-ant-design:delete-outlined"></i></template>
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
</template>

<style lang="less" scoped>
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