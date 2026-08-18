# 信号标注工具

一个用于信号可视化与区间标注的纯前端工具，面向医学标注人员与检查人员，支持身份切换、区间标注、解读报告填写与导出。

## 功能特性

### 信号可视化
- 基于 Canvas 绘制双通道信号
- 支持鼠标拖拽平移、滚轮缩放、按钮缩放/重置
- 实时光标竖线、位置进度指示
- 网格线、坐标轴、时间（分钟）/数值刻度自动标注

### 标注能力
- 支持六类区间标注：
  - 加速区间（acceleration）
  - 早期减速（earlyDeceleration）
  - 晚期减速（lateDeceleration）
  - 延长减速（prolongedDeceleration）
  - 变异减速（variableDeceleration）
  - 宫缩区间（contraction，绘制于 UC 通道）
- 两点点击创建区间，点击已有区间可确认删除
- 删除/撤销删除、标注自动持久化
- 标注记录创建者身份（annotator / reviewer）与时间戳

### 身份与流程
- 标注者（annotator）/ 检查者（reviewer）身份切换
- 未选择身份时，标注与报告操作被禁用
- 标注数据携带 `creator` 字段，便于多角色协作

### 文件管理
- 上传单个 JSON 文件、批量导入文件夹、拖拽上传
- 文件列表下拉选择、上一个/下一个导航
- 可选标签文件夹，优先从文件夹加载已标注数据（支持 `label_原名.json` 与原名两种命名）
- 标注数据通过 `localStorage` 自动缓存，并支持导出为 `label_<文件名>.json`

### 患者信息与解读报告
- 自动解析并展示患者信息：年龄、孕周、孕次、产次、BMI、身高、体重及糖尿病、高血压、子痫前期、甲状腺、地中海贫血、子宫肌瘤、卵巢囊肿、子宫瘢痕、脐带绕颈等
- 解读报告表单：检查类型（NST / OCT/CST / 其他）、基线胎心率、基线变异、加速评估、减速类型（多选互斥"无"）、宫缩评估、综合结论、自由文本
- 报告内容随标注一起保存与加载

## 目录结构

```
label_tool_v2/
├── index.html              # 页面结构
├── app.js                  # 应用入口与模块协调
├── fileManager.js          # 文件上传/导航/存储/导出
├── signalRenderer.js       # Canvas 信号渲染与缩放平移
├── annotationManager.js    # 标注创建/删除/保存/加载
├── patientInfo.js          # 孕妇信息解析与报告表单
├── styles.css              # 样式
├── npy2json.py             # .npy 转 .json 工具，附带绘图与图片合并
├── json/                   # 信号数据样例（含孕妇信息与 fhr/uc）
├── labels/                 # 标注结果样例
└── test_data.json          # 测试数据
```

## 使用方法

### 启动

直接在浏览器中打开 `index.html` 即可使用；如需本地服务器：

```bash
# 任选其一
python -m http.server 8000
# 或
npx serve
```

随后在浏览器访问对应地址。

### 标注流程

1. 在顶部"身份选择"中选择"标注者"或"检查者"
2. 点击"批量导入文件夹"选择 `json/` 目录，或上传单个 JSON 文件
3. （可选）点击"选择标签文件夹"加载已有标注
4. 通过"上一个/下一个"或下拉框选择文件
5. 在"标注工具"中选择区间类型，在信号上点击起点与终点完成标注
6. 填写"解读报告"
7. 点击"导出标注"下载 `label_<文件名>.json`

### 数据准备

信号 JSON 文件需包含如下字段（参考 `json/1001.json`）：

```json
{
  "Age": 27,
  "Week": 38,
  "Gravidity": 1,
  "Parity": 0,
  "Diabetes": 0,
  "Hypertension": 0,
  "Preeclampsia": null,
  "FrontBmi": 17.4,
  "FrontHeight": 170,
  "FrontWeight": 50.2,
  "Thyroid_disease": 0,
  "Thalassemia": 0,
  "Uterine_fibroids": 0,
  "Ovarian_cysts": 0,
  "Scarred_uterus": 0,
  "Nuchal_cord_loops": 0,
  "fhr": [158.0, 158.0, ...],
  "uc": [...]
}
```

如原始数据为 NumPy `.npy` 文件，可使用 `npy2json.py` 转换：

```bash
python npy2json.py
```

该脚本会读取 `fhr/` 与 `uc/` 目录下的同名 `.npy` 文件，合并写入 `json/` 目录下对应的 `.json` 文件，并保留 JSON 中已有的患者信息字段。

## 标注数据格式

导出/保存的标注文件结构（参考 `labels/label_1001.json`）：

```json
{
  "fileName": "1001.json",
  "annotations": [
    {
      "id": 1774173962449,
      "type": "contraction",
      "startIndex": 1,
      "endIndex": 2,
      "creator": "annotator",
      "timestamp": "2026-03-22T10:06:02.449Z"
    }
  ],
  "report": {
    "examType": "其他",
    "baselineFHR": "44",
    "baselineVariability": "absent",
    "acceleration": "none",
    "deceleration": { "none": false, "early": false, "variable": false, "late": true },
    "contraction": "no",
    "conclusion": "suspicious",
    "freeText": "sss "
  },
  "timestamp": "2026-03-22T10:09:39.662Z"
}
```

## 技术说明

- **采样频率**：4Hz，1 分钟对应 240 个采样点
- **FHR 纵轴**：0–220 bpm，主刻度步长 30 bpm；纵横比 240:90
- **UC 纵轴**：0–150 mmHg，主刻度步长 25 mmHg；纵横比 240:75
- **持久化**：浏览器 `localStorage`，键名 `label_<文件名>` 与 `report_<文件名>`
- **依赖**：前端无第三方库；`npy2json.py` 依赖 `numpy`、`matplotlib`、`Pillow`

## 模块职责

| 模块 | 职责 |
|------|------|
| `app.js` | 应用入口，协调各模块、身份校验、事件分发 |
| `fileManager.js` | 文件上传、导航、拖拽、标签文件夹、存储与导出 |
| `signalRenderer.js` | Canvas 渲染、网格/坐标、缩放平移、点击坐标转换 |
| `annotationManager.js` | 标注类型选择、两点区间创建、删除/撤销、保存/加载 |
| `patientInfo.js` | 患者信息解析与展示、解读报告表单互斥逻辑与缓存 |
