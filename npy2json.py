
import numpy as np
import json
import os
import matplotlib.pyplot as plt
from PIL import Image


def plot_fhr_with_labels(signals, save_fig_path):
    FIXED_LENGTH = 30000
    
    # 设置相同的图形宽度，调整高度
    # 宽度设为相同的120，高度根据内容调整
    plt.figure(figsize=(110, 5))
    
    scale = 0.1
    fs = 50 * scale
    lw = 8 * scale
    
    
    # 绘制网格线
    for i in range(0, FIXED_LENGTH + 1, 40):
        if i % 240 == 0:
            plt.axvline(x=i, color='gray', linestyle='--', linewidth=lw)
        else:
            plt.axvline(x=i, color='gray', linestyle='--', linewidth=1 * scale)
    
    for i in range(0, 221, 10):
        if i % 30 == 0:
            plt.axhline(y=i, color='gray', linestyle='--', linewidth=lw)
        else:
            plt.axhline(y=i, color='gray', linestyle='--', linewidth=1 * scale)
    
    # 绘制信号
    plt.plot(range(len(signals)), signals, color='black', linewidth=lw)
    
    
    # 设置刻度和标签
    pos = np.arange(0, FIXED_LENGTH + 1, 240)
    plt.xticks(pos, (pos // 240), fontsize=fs, ha='center')
    plt.yticks(range(0, 221, 30), fontsize=fs)
    plt.xlabel('Time(min)', fontsize=fs)
    plt.ylabel('FHR (bpm)', fontsize=fs)
    plt.title('Signal', fontsize=fs, pad=20)
    
    # 设置纵横比
    aspect_ratio = 240 / 90
    plt.gca().set_aspect(aspect_ratio, adjustable='box')
    plt.gca().set_xlim(left=0, right=FIXED_LENGTH)
    plt.gca().set_ylim(bottom=0)
    
    # 设置相同的边距和坐标轴位置
    plt.subplots_adjust(left=0.08, right=0.95, top=0.9, bottom=0.15)
    
    plt.tick_params(axis='x', which='major', pad=2)
    plt.tight_layout(pad=0.5)  # 自动压缩空白
    plt.savefig(save_fig_path, dpi=300)
    plt.close(plt.gcf())


def plot_uc_with_labels(uc, save_fig_path):
    FIXED_LENGTH = 30000
    
    # 设置相同的图形宽度，高度调整
    plt.figure(figsize=(110, 3))
    
    scale = 0.1
    fs = 50 * scale
    lw = 8 * scale
    
    # 绘制网格线
    for i in range(0, FIXED_LENGTH + 1, 40):
        if i % 240 == 0:
            plt.axvline(x=i, color='gray', linestyle='--', linewidth=lw)
        else:
            plt.axvline(x=i, color='gray', linestyle='--', linewidth=1 * scale)
    
    for i in range(0, 151, 5):
        if i % 25 == 0:
            plt.axhline(y=i, color='gray', linestyle='--', linewidth=lw)
        else:
            plt.axhline(y=i, color='gray', linestyle='--', linewidth=1 * scale)
    
    # 绘制信号
    plt.plot(range(len(uc)), uc, color='black', linewidth=lw)
    
    # 设置刻度和标签
    pos = np.arange(0, FIXED_LENGTH + 1, 240)
    plt.xticks(pos, (pos // 240), fontsize=fs, ha='center')
    plt.yticks(range(0, 151, 25), fontsize=fs)
    plt.xlabel('Time(min)', fontsize=fs)
    plt.ylabel('UC (mmHg)', fontsize=fs)
    
    # 设置纵横比
    aspect_ratio = 240 / 75
    plt.gca().set_aspect(aspect_ratio, adjustable='box')
    plt.gca().set_xlim(left=0, right=FIXED_LENGTH)
    plt.gca().set_ylim(bottom=0)
    
    # 设置相同的边距和坐标轴位置（与FHR图相同）
    plt.subplots_adjust(left=0.08, right=0.95, top=0.9, bottom=0.15)
    
    plt.tick_params(axis='x', which='major', pad=2)
    plt.tight_layout(pad=0.5)  # 自动压缩空白
    plt.savefig(save_fig_path, dpi=300)
    plt.close(plt.gcf())


def combine_and_delete_images(image_path1, image_path2, output_path, direction='vertical'):
    """
    将两张图片合并为一张，并删除原始图片。
    """
    # 打开图片
    img1 = Image.open(image_path1)
    img2 = Image.open(image_path2)
    
    # 获取图片尺寸
    width1, height1 = img1.size
    width2, height2 = img2.size
    
    if direction == 'vertical':
        # 垂直合并
        # 首先裁剪两张图片，使宽度相同
        min_width = min(width1, width2)
        
        # 计算裁剪区域（居中裁剪）
        left1 = (width1 - min_width) // 2
        img1_cropped = img1.crop((left1, 200, left1 + min_width, height1-300))
        
        left2 = (width2 - min_width) // 2
        img2_cropped = img2.crop((left2, 100, left2 + min_width, height2))
        
        # 创建新图片
        new_width = min_width
        new_height = height1-200-300 + height2-100
        combined_img = Image.new('RGB', (new_width, new_height))
        
        # 粘贴图片
        combined_img.paste(img1_cropped, (0, 0))
        combined_img.paste(img2_cropped, (0, height1-200-300))
    else:
        # 水平合并
        new_width = width1 + width2
        new_height = max(height1, height2)
        combined_img = Image.new('RGB', (new_width, new_height))
        combined_img.paste(img1, (0, 0))
        combined_img.paste(img2, (width1, 0))
    
    # 保存合并后的图片
    combined_img.save(output_path, dpi=(300, 300))
    
    # 删除原始图片
    os.remove(image_path1)
    os.remove(image_path2)
if __name__ == '__main__':
    fhr_dir=r"fhr"
    uc_dir=r"uc"
    json_dir=r"json"
    for file in os.listdir(fhr_dir):
        fhr=np.load(os.path.join(fhr_dir,file))
        uc=np.load(os.path.join(uc_dir,file))
        data={
            'fhr':fhr.tolist(),
            'uc':uc.tolist()
        }
        # 读取现有的JSON文件
        try:
            with open(os.path.join(json_dir,file.replace('npy','json')),'r',encoding='utf-8') as f:
                existing_data = json.load(f)
                f.close()
        except FileNotFoundError:
            # 如果文件不存在，创建一个空字典
            existing_data = {}
        
        # 将新数据添加到现有数据中
        existing_data['fhr'] = fhr.tolist()
        existing_data['uc'] = uc.tolist()
        
        # 写入更新后的JSON文件
        with open(os.path.join(json_dir,file.replace('npy','json')),'w',encoding='utf-8') as f:
            json.dump(existing_data, f, indent=4)
            f.close()
    # with open('1001.json','r',encoding='utf-8') as f:
    #     data=json.load(f)
    #     f.close()
    #     fhr=np.array(data['fhr'])
    #     uc=np.array(data['uc'])
        # plot_fhr_with_labels(fhr, save_fig_path='1001_fhr.png')
        # plot_uc_with_labels(uc, save_fig_path='1001_uc.png')
        # combine_and_delete_images('1001_fhr.png', '1001_uc.png', '1001_json.png', direction='vertical')
