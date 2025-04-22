# Vue 3 + Vite

## 描述
Vite+Vue3调用DeepSeek进行对话，使用本地缓存的方式，不进行网络数据库存储。

## 环境说明
> node -v : v18.20.5
> npm -v : 10.8.2

## DeepSeek秘钥配置

1. 复制工程目录下的示例文件 

   ```bash
   cp .env .env.local
   ```

2. 填写你的API密钥

   ```bash
   VITE_DEEPSEEK_API_KEY=sk-your_api_key_here
   ```

