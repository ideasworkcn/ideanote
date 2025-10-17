'use client'

import Link from 'next/link'
import { usePathname , useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Clapperboard, Menu, User, LogOut, BookOpen } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const navigation = [
  { href: '/', label: '首页' },
  { href: '/topics', label: '项目' },
  { href: '/notion', label: '文案' },
  { href: '/progress', label: '进度' },
  { href: '/music', label: '音乐' },
  { href: '/courses', label: '课程' },
  { href: '/read', label: '提词' },
  { href: '/cover', label: '封面' },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isScrolled, setIsScrolled] = useState(false)

  const handleLogout = () => {
    localStorage.clear()
    setUser(null)
    router.push('/')
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          console.error('Failed to fetch user data');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-gray-100' 
        : 'bg-white/80 backdrop-blur-md'
    }`}>
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          {/* 品牌Logo - 突出显示 */}
          <div className="flex items-center">
            <Link href="/" className="group flex items-center space-x-3 transition-transform duration-200 hover:scale-105">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-600 to-purple-600 rounded-xl blur-sm opacity-20 group-hover:opacity-30 transition-opacity duration-200"></div>
                <div className="relative bg-gradient-to-br from-rose-600 to-purple-600 p-2 rounded-xl">
                  <Clapperboard className='w-6 h-6 text-white'/>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  VideoFlow
                </span>
                <span className="text-xs text-gray-500 font-medium tracking-wide">
                  视频创作平台
                </span>
              </div>
            </Link>
          </div>

          {/* 完整导航 - 桌面端 */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigation.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group ${
                  pathname === link.href
                    ? 'text-rose-600 bg-rose-50'
                    : 'text-gray-700 hover:text-rose-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
                {pathname === link.href && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-rose-600 rounded-full"></div>
                )}
              </Link>
            ))}
          </div>

          {/* 用户操作区域 */}
          <div className="flex items-center gap-3">
            {/* 移动端菜单 */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="relative">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-br from-rose-600 to-purple-600 p-2 rounded-xl">
                        <Clapperboard className='w-5 h-5 text-white'/>
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">VideoFlow</div>
                        <div className="text-xs text-gray-500">视频创作平台</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="space-y-1">
                      {navigation.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                            pathname === link.href
                              ? 'text-rose-600 bg-rose-50'
                              : 'text-gray-700 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* 用户菜单 */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-purple-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                      {user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mt-2" align="end">
                  <DropdownMenuLabel className="font-medium">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-gray-900">我的账户</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/user')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    个人中心
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/user/${user.id}/courses`)} className="cursor-pointer">
                    <BookOpen className="w-4 h-4 mr-2" />
                    我的课程
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => router.push('/login')} 
                  className="text-sm font-medium text-gray-700 hover:text-rose-600"
                >
                  登录
                </Button>
                <Button 
                  onClick={() => router.push('/register')} 
                  className="bg-gradient-to-r from-red-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-rose-500/25"
                >
                  注册
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}