import { authRequestClient } from '#/api/request';

export interface ConfigData {
  [key: string]: string;
}

export interface SaveConfigParams {
  name: string;
  config_data: Record<string, string>;
}

export interface ApiKeyInfo {
  key: string;
  name: string;
  created_time: string;
  last_used_time: string | null;
}

export interface ConfigItem {
  api_key_id: number;
  api_key: {
    key: string;
    name: string;
    created_time: string;
    last_used_time: string | null;
  };
}

export interface SysConfigInfo {
  configs: ConfigItem[];
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// Mock数据，仅用于调试时在控制台对比实际返回的数据结构
// const mockConfigResponse: ApiResponse<SysConfigInfo> = {
//   code: 200,
//   msg: "请求成功",
//   data: {
//     configs: [
//       {
//         api_key_id: 1,
//         api_key: {
//           key: 'wilmar-2f05****************************81d0',
//           name: '测试配置',
//           created_time: '2023-07-01T12:00:00',
//           last_used_time: null
//         }
//       }
//     ]
//   }
// };

/**
 * 保存配置并生成API Key
 */
export function saveConfigApi(params: SaveConfigParams) {
  // 确保params是正确格式
  const formattedParams = {
    name: params.name,
    config_data: params.config_data
  };

  try {
    console.log('发送配置保存请求:', formattedParams);
    // 使用标准格式发送请求
    return authRequestClient.post('/api/v1/option/save-config', formattedParams, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('saveConfigApi 错误:', error);
    throw error;
  }
}

/**
 * 获取用户历史配置和API Key信息
 */
export function getConfigInfoApi() {
  return authRequestClient.get('/api/v1/option/get-sys-config-info');
}

/**
 * 通过Key ID删除配置和API Key
 */
export function deleteConfigByIdApi(id: number) {
  return authRequestClient.delete(`/api/v1/option/delete-key-by-id/${id}`);
}

// 获取未加密的API Key
export function getApiKeyById(id: number) {
  return authRequestClient.get<ApiResponse<string>>(`/api/v1/option/get-api-key/${id}`);
}

// 获取配置数据
export function getConfigByApiKey(apiKey: string) {
  return authRequestClient.get<ApiResponse<{ config_data: Record<string, string> }>>('/api/v1/option/get-config', {
    headers: {
      'api-key': apiKey
    }
  });
}

/**
 * 更新现有配置
 */
export function updateConfigApi(apiKey: string, configData: Record<string, string>) {
  return authRequestClient.put('/api/v1/option/update-config', 
    { config_data: configData },
    {
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      }
    }
  );
} 