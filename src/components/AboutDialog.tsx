import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Heart, Mail, Globe, Github } from 'lucide-react';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const openLink = (url: string) => {
    if (window.electronAPI) {
      // 在 Electron 环境中，可以通过 shell 打开链接
      // 这里暂时使用 window.open，实际项目中可能需要通过 IPC 调用
      window.open(url, '_blank');
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            关于 IdeaNote
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 应用信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">应用信息</CardTitle>
              <CardDescription>
                IdeaNote - AI驱动的创意写作工具
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">版本</span>
                <Badge variant="secondary">v1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">开发者</span>
                <span className="text-sm">ideaswork</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">许可证</span>
                <Badge variant="outline">MIT</Badge>
              </div>
            </CardContent>
          </Card>

          {/* 平台信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                关于创想家平台
              </CardTitle>
              <CardDescription>
                专注于AI驱动的创意工具开发
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                创想家是一个专注于AI技术应用的创新平台，致力于为用户提供高效、智能的创作工具。
                我们相信AI技术能够激发人类的创造力，让每个人都能轻松创作出优质的内容。
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => openLink('https://ideaswork.cn')}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  官方网站
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button> */}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => openLink('https://github.com/ideasworkcn')}
                >
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => openLink('mailto:ideaswork@qq.com')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  联系我们
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => openLink('https://space.bilibili.com/28249524')}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  更多产品
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              </div>
            </CardContent>
          </Card>


          {/* 致谢 */}
          <div className="text-center text-sm text-muted-foreground">
            {/* <p>感谢所有开源项目的贡献者</p> */}
            <p className="mt-1">Made with ❤️ by ideaswork</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}