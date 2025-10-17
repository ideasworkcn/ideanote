import React from 'react';
import { Separator } from '@/components/ui/separator';
import { ExternalLink } from 'lucide-react';

interface FooterNavigation {
  main: {
    name: string;
    href: string;
  }[];
}

const footerNavigation: FooterNavigation = {
  main: [
    {
      name: "Bilibili",
      href: "https://space.bilibili.com/28249524?spm_id_from=333.1007.0.0",
    },
    { name: "知乎", href: "https://www.zhihu.com/people/wang-qing-gang-41" },
    { name: "Twitter", href: "https://twitter.com/wqg599252594" },
    {
      name: "Youtube",
      href: "https://www.youtube.com/channel/UChxgfdsYVrQw-jy1IxWbSNA",
    },
  ]
};

const beian = [
  {
    id: 1,
    name: "鲁公网安备 37078202000380号",
    href: "http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=37078202000380",
  },
  { id: 2, name: "鲁ICP备16008370号-4", href: "https://beian.miit.gov.cn/" },
];

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-t border-slate-200/50 dark:border-slate-800/50">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-r from-rose-50/30 via-transparent to-indigo-50/30 dark:from-rose-950/20 dark:via-transparent dark:to-indigo-950/20" />
      
      <div className="relative container mx-auto px-4 py-8">
        {/* 社交媒体链接 */}
        <nav className="flex flex-wrap justify-center gap-6 mb-6" aria-label="Footer">
          {footerNavigation.main.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-200 hover:scale-105"
            >
              <span className="font-medium">{item.name}</span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </a>
          ))}
        </nav>
        
        <Separator className="mb-6 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
        
        {/* 版权信息 */}
        <div className="text-center space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            &copy; 2020{' '}
            <span className="bg-gradient-to-r from-rose-600 to-indigo-600 bg-clip-text text-transparent font-semibold">
              Ideaswork.cn
            </span>
            . All rights reserved.
          </p>
          
          {/* 备案信息 */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
            {beian.map((project, index) => (
              <React.Fragment key={project.id}>
                <a
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  {project.name}
                </a>
                {index < beian.length - 1 && (
                  <Separator orientation="vertical" className="h-3 hidden sm:block bg-slate-300 dark:bg-slate-700" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      
      {/* 底部渐变装饰 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
    </footer>
  );
}
