import { baseRequestClient, requestClient } from '#/api/request';

export interface SaveConfigParams {
  name: string;
  config_data: Record<string, string>;
}
export interface ConfigItem {
  api_key_id: number;
  api_key: {
    created_time: string;
    key: string;
    last_used_time: null | string;
    name: string;
  };
}

export interface SysConfigInfo {
  configs: ConfigItem[];
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
    config_data: params.config_data,
  };

  try {
    return baseRequestClient.post(
      '/api/v1/option/save-config',
      formattedParams,
    );
  } catch (error) {
    console.error('saveConfigApi 错误:', error);
    throw error;
  }
}

/**
 * 获取用户历史配置和API Key信息
 */
export function getConfigInfoApi() {
  return requestClient.get<SysConfigInfo>('/api/v1/option/get-sys-config-info');
}

/**
 * 通过Key ID删除配置和API Key
 */
export function deleteConfigByIdApi(id: number) {
  return requestClient.delete(`/api/v1/option/delete-key-by-id/${id}`);
}

// 获取未加密的API Key
export function getApiKeyById(id: number) {
  return requestClient.get<string>(`/api/v1/option/get-api-key/${id}`);
}

// 获取配置数据
export function getConfigByApiKey(apiKey: string) {
  return baseRequestClient.get<SaveConfigParams>('/api/v1/option/get-config', {
    headers: {
      'api-key': apiKey,
    },
  });
}

/**
 * 更新现有配置
 */
export function updateConfigApi(
  apiKey: string,
  configData: Record<string, string>,
) {
  return baseRequestClient.put(
    '/api/v1/option/update-config',
    { config_data: configData },
    {
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
    },
  );
}
