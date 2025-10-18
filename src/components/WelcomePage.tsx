import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, FileText, Sparkles } from 'lucide-react';

interface WelcomePageProps {
  onSelectWorkspace: () => void;
  onUseDefault: () => void;
  workspacePath?: string;
}

export default function WelcomePage({ onSelectWorkspace, onUseDefault, workspacePath }: WelcomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            欢迎使用 IdeaNote
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            选择您的工作区文件夹来开始创作<br/>
            <span className="text-sm text-gray-500">by ideaswork (B站: ideaswork)</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button 
            onClick={onSelectWorkspace}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            size="lg"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            选择工作区文件夹
          </Button>
          
          {workspacePath && (
            <Button 
              onClick={onUseDefault}
              variant="outline"
              className="w-full h-12 border-gray-300 hover:bg-gray-50"
              size="lg"
            >
              <FileText className="w-5 h-5 mr-2" />
              使用默认工作区
            </Button>
          )}
          
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              工作区用于存储您的所有笔记和文档
            </p>
            {workspacePath && (
              <p className="text-xs text-gray-400 text-center mt-1 truncate">
                默认位置: {workspacePath}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}