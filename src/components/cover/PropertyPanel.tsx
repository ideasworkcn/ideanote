import React, { useCallback, useMemo } from 'react';
import { Canvas, FabricObject, Textbox, FabricImage, Shadow } from 'fabric';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface TextItem {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  fontWeight: number;
  stroke: string;
  strokeWidth: number;
  shadow: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

interface ImageItem {
  scaleX: number;
  scaleY: number;
  stroke: string;
  strokeWidth: number;
  shadow: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

interface PropertyPanelProps {
  isPc: boolean;
  canvas: Canvas | null;
  selectedObject: FabricObject | null;
  bgColor: string;
  textItem: TextItem;
  imageItem: ImageItem;
  fontOptions: string[];
  onBgColorChange: (color: string) => void;
  onLinearBgColorChange: (gradient: string) => void;
  onTextItemChange: (textItem: TextItem) => void;
  onImageItemChange: (imageItem: ImageItem) => void;
}

// 常量配置
const GRADIENT_PRESETS = [
  'linear-gradient(45deg, #f6d365, #fda085)',
  'linear-gradient(45deg, #f093fb, #f5576c)',
  'linear-gradient(45deg, rgb(255, 184, 142), rgb(234, 87, 83))',
  'linear-gradient(45deg, rgb(247, 186, 44), rgb(234, 84, 89))',
  'linear-gradient(45deg, rgb(234, 152, 218), rgb(91, 108, 249))',
  'linear-gradient(45deg, rgb(243, 105, 110), rgb(248, 169, 2))',
  'linear-gradient(45deg, rgb(255, 215, 138), rgb(244, 118, 45))',
  'linear-gradient(45deg, rgb(237, 227, 66), rgb(255, 81, 235))'
];

const COLOR_PRESETS = [
  '#000000', '#ffffff', '#FFA500', '#5FCC8A', 
  '#58B9F8', '#995DF6', '#75FB7E', '#EE7B69', 
  '#E15B34', '#FFC0CB', '#F7D748', '#00FFFF'
];

// 子组件：背景颜色选择器
const BackgroundColorPicker: React.FC<{
  bgColor: string;
  onBgColorChange: (color: string) => void;
  onLinearBgColorChange: (gradient: string) => void;
  canvas: Canvas | null;
}> = ({ bgColor, onBgColorChange, onLinearBgColorChange, canvas }) => {
  const handleBgColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    onBgColorChange(newColor);
    if (canvas) {
      canvas.backgroundColor = newColor;
      canvas.renderAll();
    }
  }, [onBgColorChange, canvas]);

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="bg-color" className="text-sm font-medium mb-2 block">
          画布背景颜色
        </Label>
        <Input
          id="bg-color"
          type="color"
          value={bgColor}
          onChange={handleBgColorChange}
          className="h-10 w-full cursor-pointer"
        />
      </div>
      
      <div>
        <Label className="text-sm font-medium mb-2 block">
          渐变预设
        </Label>
        <div className="grid grid-cols-8 gap-2">
          {GRADIENT_PRESETS.map((gradient, index) => (
            <div
              key={gradient}
              style={{ background: gradient }}
              className="aspect-square rounded-lg border-2 border-gray-200 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => onLinearBgColorChange(gradient)}
              role="button"
              tabIndex={0}
              aria-label={`渐变预设 ${index + 1}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onLinearBgColorChange(gradient);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// 子组件：颜色选择器
const ColorPicker: React.FC<{
  selectedObject: FabricObject;
  canvas: Canvas | null;
}> = ({ selectedObject, canvas }) => {
  const handleColorChange = useCallback((color: string) => {
    if (selectedObject) {
      selectedObject.set('fill', color);
      canvas?.renderAll();
    }
  }, [selectedObject, canvas]);

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="object-color" className="text-sm font-medium mb-2 block">
          对象颜色
        </Label>
        <Input
          id="object-color"
          type="color"
          value={selectedObject.fill?.toString() || '#000000'}
          onChange={(e) => handleColorChange(e.target.value)}
          className="h-10 w-full cursor-pointer"
        />
      </div>
      
      <div>
        <Label className="text-sm font-medium mb-2 block">
          颜色预设
        </Label>
        <div className="grid grid-cols-12 gap-2">
          {COLOR_PRESETS.map((color) => (
            <div
              key={color}
              style={{ backgroundColor: color }}
              className="aspect-square rounded-full border-2 border-gray-200 cursor-pointer transition-all duration-200 hover:scale-110 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => handleColorChange(color)}
              role="button"
              tabIndex={0}
              aria-label={`颜色 ${color}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleColorChange(color);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// 子组件：阴影控制器
const ShadowControls: React.FC<{
  selectedObject: FabricObject;
  canvas: Canvas | null;
  textItem: TextItem;
  imageItem: ImageItem;
  onTextItemChange: (textItem: TextItem) => void;
  onImageItemChange: (imageItem: ImageItem) => void;
}> = ({ selectedObject, canvas, textItem, imageItem, onTextItemChange, onImageItemChange }) => {
  const updateShadow = useCallback((property: 'blur' | 'offsetX' | 'offsetY', value: number) => {
    if (!selectedObject) return;

    const currentShadow = selectedObject.shadow || { color: '#000000', blur: 0, offsetX: 0, offsetY: 0 };
    const newShadow = new Shadow({
      ...currentShadow,
      [property]: value,
      ...(property === 'offsetX' && { offsetY: value }) // 同时更新 offsetY
    });
    
    selectedObject.set('shadow', newShadow);
    canvas?.renderAll();

    // 更新状态
    const shadowUpdate = {
      ...currentShadow,
      [property]: value,
      ...(property === 'offsetX' && { offsetY: value })
    };

    if (selectedObject.type === 'textbox') {
      onTextItemChange({ ...textItem, shadow: shadowUpdate });
    } else if (selectedObject.type === 'image') {
      onImageItemChange({ ...imageItem, shadow: shadowUpdate });
    }
  }, [selectedObject, canvas, textItem, imageItem, onTextItemChange, onImageItemChange]);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">
          阴影模糊度: {selectedObject.shadow?.blur || 0}
        </Label>
        <Input
          type="range"
          min="0"
          max="20"
          value={selectedObject.shadow?.blur || 0}
          onChange={(e) => updateShadow('blur', parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      
      <div>
        <Label className="text-sm font-medium mb-2 block">
          阴影偏移量: {selectedObject.shadow?.offsetX || 0}
        </Label>
        <Input
          type="range"
          min="0"
          max="20"
          value={selectedObject.shadow?.offsetX || 0}
          onChange={(e) => updateShadow('offsetX', parseInt(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
};

// 子组件：边框控制器
const BorderControls: React.FC<{
  selectedObject: FabricObject;
  canvas: Canvas | null;
  textItem: TextItem;
  imageItem: ImageItem;
  onTextItemChange: (textItem: TextItem) => void;
  onImageItemChange: (imageItem: ImageItem) => void;
}> = ({ selectedObject, canvas, textItem, imageItem, onTextItemChange, onImageItemChange }) => {
  const updateBorder = useCallback((property: 'stroke' | 'strokeWidth', value: string | number) => {
    if (!selectedObject) return;

    selectedObject.set(property, value);
    canvas?.renderAll();

    if (selectedObject.type === 'textbox') {
      onTextItemChange({ ...textItem, [property]: value });
    } else if (selectedObject.type === 'image') {
      onImageItemChange({ ...imageItem, [property]: value });
    }
  }, [selectedObject, canvas, textItem, imageItem, onTextItemChange, onImageItemChange]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="border-color" className="text-sm font-medium mb-2 block">
          边框颜色
        </Label>
        <Input
          id="border-color"
          type="color"
          value={selectedObject?.stroke?.toString() || '#000000'}
          onChange={(e) => updateBorder('stroke', e.target.value)}
          className="w-full cursor-pointer"
        />
      </div>
      
      <div>
        <Label className="text-sm font-medium mb-2 block">
          边框粗细: {selectedObject?.strokeWidth || 0}
        </Label>
        <Input
          type="range"
          min="0"
          max="20"
          value={selectedObject?.strokeWidth || 0}
          onChange={(e) => updateBorder('strokeWidth', parseInt(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
};

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  isPc,
  canvas,
  selectedObject,
  bgColor,
  textItem,
  imageItem,
  fontOptions,
  onBgColorChange,
  onLinearBgColorChange,
  onTextItemChange,
  onImageItemChange,
}) => {
  const containerClassName = useMemo(() => 
    isPc ? 'w-full xl:w-1/3 lg:pl-4' : 'w-full md:w-1/4 pl-4',
    [isPc]
  );

  const handleFontChange = useCallback((font: string) => {
    if (selectedObject && selectedObject.type === 'textbox') {
      const textObj = selectedObject as Textbox;
      textObj.set('fontFamily', font);
      canvas?.renderAll();
      onTextItemChange({ ...textItem, fontFamily: font });
    }
  }, [selectedObject, canvas, textItem, onTextItemChange]);

  return (
    <div className={containerClassName}>
      <div className="space-y-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* 背景颜色设置 */}
        <BackgroundColorPicker
          bgColor={bgColor}
          onBgColorChange={onBgColorChange}
          onLinearBgColorChange={onLinearBgColorChange}
          canvas={canvas}
        />
        
        {/* 选中对象属性 */}
        {selectedObject && (
          <div className="space-y-6 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">对象属性</h3>
            
            {/* 字体选择 */}
            {selectedObject.type === 'textbox' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">字体</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full h-10 justify-between">
                      <span style={{ fontFamily: (selectedObject as Textbox).fontFamily }}>
                        {(selectedObject as Textbox).fontFamily || textItem.fontFamily}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto">
                    {fontOptions.map((font) => (
                      <DropdownMenuItem
                        key={font}
                        onClick={() => handleFontChange(font)}
                        style={{ fontFamily: font }}
                        className={`cursor-pointer ${
                          (selectedObject as Textbox).fontFamily === font ? 'bg-blue-50' : ''
                        }`}
                      >
                        {font}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            
            {/* 颜色选择 */}
            <ColorPicker selectedObject={selectedObject} canvas={canvas} />
            
            {/* 阴影控制 */}
            <ShadowControls
              selectedObject={selectedObject}
              canvas={canvas}
              textItem={textItem}
              imageItem={imageItem}
              onTextItemChange={onTextItemChange}
              onImageItemChange={onImageItemChange}
            />

            {/* 边框控制 */}
            <BorderControls
              selectedObject={selectedObject}
              canvas={canvas}
              textItem={textItem}
              imageItem={imageItem}
              onTextItemChange={onTextItemChange}
              onImageItemChange={onImageItemChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;