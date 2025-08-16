# 加密密钥设置说明

## 生成加密密钥

为了安全存储配置数据，需要设置一个 32 字节的加密密钥。

### 生成新密钥

使用以下 Node.js 命令生成一个新的 base64 编码的 32 字节密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

或者在 Python 中：

```bash
python3 -c "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"
```

### 设置环境变量

将生成的密钥设置为环境变量：

```bash
export ENCRYPTION_KEY="your_base64_encoded_key_here"
```

### Render 部署平台

在 Render 上部署时，需要在环境变量中设置加密密钥：

1. **登录 Render 控制台**
   - 访问 [render.com](https://render.com) 并登录

2. **选择您的服务**
   - 在 Dashboard 中找到您的 Stremio FTP Subtitles 服务
   - 点击进入服务详情页

3. **配置环境变量**
   - 点击左侧菜单的 "Environment"
   - 点击 "Add Environment Variable" 按钮
   - Key: `ENCRYPTION_KEY`
   - Value: 粘贴您生成的 base64 编码密钥
   - 点击 "Save Changes"

4. **重新部署**
   - 保存环境变量后，服务会自动重新部署
   - 等待部署完成即可

**注意**：首次部署时就应该设置此环境变量，否则后续添加密钥时，之前的配置数据将无法读取。

**使用一键部署按钮**：
如果您使用 README 中的 "Deploy to Render" 按钮，部署后需要：
1. 生成加密密钥：`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. 在 Render 控制台的 Environment 页面手动添加 `ENCRYPTION_KEY` 环境变量
3. 保存后等待自动重新部署

### Docker 环境

在 `docker-compose.yml` 中添加：

```yaml
environment:
  - ENCRYPTION_KEY=your_base64_encoded_key_here
```

或者在 `.env` 文件中：

```
ENCRYPTION_KEY=your_base64_encoded_key_here
```

## 重要提醒

1. **密钥必须保持一致**：如果更换密钥，之前保存的配置数据将无法解密
2. **安全存储**：请妥善保管密钥，不要将其提交到代码仓库
3. **备份密钥**：建议将密钥安全备份，丢失密钥将导致数据永久无法恢复

## 迁移现有数据

如果您之前使用的是自动生成的密钥，现有数据可能无法解密。您需要：

1. 备份现有配置
2. 设置新的固定密钥
3. 重新配置 FTP 连接

## 验证加密系统

使用内置的测试脚本验证加密系统是否正常工作：

```bash
npm run test-encryption
```

这个脚本将会：
- 验证 `ENCRYPTION_KEY` 环境变量是否正确设置
- 检查密钥格式和长度
- 测试加密/解密功能
- 确认存储系统能正常初始化

如果测试失败，请检查密钥设置或查看错误信息进行修复。
