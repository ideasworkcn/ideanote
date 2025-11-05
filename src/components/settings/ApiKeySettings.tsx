import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Key, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ApiKeySettingsProps {
  trigger?: React.ReactNode;
}

const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 加载现有的 API Key
  useEffect(() => {
    if (isOpen) {
      loadApiKey();
    }
  }, [isOpen]);

  // 当模型切换时，加载对应的 API Key
  useEffect(() => {
    if (isOpen) {
      loadApiKeyForModel(selectedModel);
    }
  }, [selectedModel, isOpen]);

  const loadApiKey = async () => {
    try {
      setIsLoading(true);
      // Load model preference first
      const model = await window.electronAPI.settings.getModel();
      if (model) {
        setSelectedModel(model);
      }
      // Then load API key for the selected model
      const result = await window.electronAPI.settings.getApiKey(model || 'deepseek');
      if (result.success && result.apiKey) {
        setApiKey(result.apiKey);
      }
    } catch (error) {
      console.error('Failed to load API key:', error);
      setMessage({ type: 'error', text: '加载 API Key 失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadApiKeyForModel = async (model: string) => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.settings.getApiKey(model);
      if (result.success) {
        setApiKey(result.apiKey || '');
      }
    } catch (error) {
      console.error(`Failed to load API key for model ${model}:`, error);
      setMessage({ type: 'error', text: '加载 API Key 失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      const result = await window.electronAPI.settings.setApiKey(apiKey.trim(), selectedModel);
      const modelResult = await window.electronAPI.settings.setModel(selectedModel);
      
      if (result.success && modelResult.success) {
        setMessage({ type: 'success', text: 'API Key 保存成功！' });
        setTimeout(() => {
          setIsOpen(false);
          setMessage(null);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.error || modelResult.error || '保存失败' });
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      setMessage({ type: 'error', text: '保存 API Key 失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: '请先输入 API Key' });
      return;
    }

    try {
      setIsTesting(true);
      setMessage(null);

      // 先保存 API Key 和模型选择
      const saveResult = await window.electronAPI.settings.setApiKey(apiKey.trim(), selectedModel);
      const modelResult = await window.electronAPI.settings.setModel(selectedModel);
      
      if (!saveResult.success || !modelResult.success) {
        setMessage({ type: 'error', text: '保存设置失败' });
        return;
      }

      // 测试 API Key
      const testResult = await window.electronAPI.ai.generate('测试', 'generate');
      if (testResult.success) {
        setMessage({ type: 'success', text: 'API Key 测试成功！连接正常' });
      } else {
        setMessage({ type: 'error', text: `API Key 测试失败: ${testResult.error}` });
      }
    } catch (error) {
      console.error('Failed to test API key:', error);
      setMessage({ type: 'error', text: 'API Key 测试失败' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      const result = await window.electronAPI.settings.setApiKey('', selectedModel);
      if (result.success) {
        setApiKey('');
        setMessage({ type: 'info', text: 'API Key 已清除' });
      } else {
        setMessage({ type: 'error', text: result.error || '清除失败' });
      }
    } catch (error) {
      console.error('Failed to clear API key:', error);
      setMessage({ type: 'error', text: '清除 API Key 失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Settings className="h-4 w-4 mr-2" />
      API 设置
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            AI API 设置
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-sm font-medium">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="pr-10"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
                disabled={isLoading}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              输入所选模型的 API Key，将被安全加密存储在本地
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-select" className="text-sm font-medium">选择 AI 模型</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model-select" className="w-full">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                {/* <SelectItem value="openai">OpenAI</SelectItem> */}
                <SelectItem value="qwen3">Qwen3</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              选择您要使用的 AI 模型（不同模型需要对应的 API Key）
            </p>
          </div>

          {message && (
            <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 
                            message.type === 'success' ? 'border-green-200 bg-green-50' : 
                            'border-blue-200 bg-blue-50'}>
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription className={
                message.type === 'error' ? 'text-red-700' :
                message.type === 'success' ? 'text-green-700' :
                'text-blue-700'
              }>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={isLoading || !apiKey.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              保存
            </Button>
            <Button 
              onClick={handleTest} 
              variant="outline"
              disabled={isTesting || !apiKey.trim()}
              className="flex-1"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              测试连接
            </Button>
          </div>

          <div className="flex justify-between items-center">
            <Button 
              onClick={handleClear} 
              variant="destructive"
              size="sm"
              disabled={isLoading || !apiKey.trim()}
            >
              清除 API Key
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">如何获取 API Key？</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• <strong>DeepSeek:</strong> 访问 <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">DeepSeek 开放平台</a></p>
              {/* <p>• <strong>OpenAI:</strong> 访问 <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI 平台</a></p> */}
              <p>• <strong>Qwen3:</strong> 访问 <a href="https://bailian.console.aliyun.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">阿里云 DashScope</a></p>
              <p>注册账号并创建 API Key，然后复制到上方输入框中</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeySettings;