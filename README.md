# 乐理大师 (Music Theory App)

这是一个功能强大的全栈音乐理论应用程序，旨在帮助音乐人分析调性、查询和弦、探索和弦进行（Chord Progressions）并生成乐谱。

![App Screenshot](https://via.placeholder.com/800x400?text=Music+Theory+App+Screenshot) 
*(注：请替换为实际截图)*

## ✨ 主要功能

### 1. 🎵 调性分析 (Key Analysis)
*   **全面分析**：支持所有大调（Major Keys）及其关系小调（Relative Minor）的分析。
*   **详细信息**：显示调号、音阶组成音。
*   **顺阶和弦**：自动列出当前调内的所有顺阶三和弦（Triads）和七和弦（7th Chords）。
*   **可视化**：通过 VexFlow 动态渲染五线谱，显示每个和弦的构成音。
*   **专业符号**：使用 LaTeX 渲染专业的和弦符号（如 $IV_{maj7}$, $ii_m^7$）。

### 2. 🎸 即兴伴奏走向 (Jam / Chord Progression)
*   **经典模板**：内置多种经典和弦走向模板（如 Pop Standard 1-6-4-5, Jazz 2-5-1, Canon, Blues 等）。
*   **一键转调**：随意切换调性，整首乐曲的和弦走向会自动无缝转调。
*   **智能生成**：AI 算法随机生成符合乐理逻辑的和弦进行，激发创作灵感。
*   **自由编辑**：点击任意和弦卡片即可进入编辑模式，自由修改根音和和弦类型（支持借用和弦、变化和弦等）。
*   **乐谱导出**：
    *   🎼 **导出五线谱 (PDF)**：适合演奏者，包含完整的五线谱和音符。
    *   📄 **导出简谱/Lead Sheet (PDF)**：隐藏五线谱，仅保留大号和弦名称，适合即兴伴奏。

### 3. 📖 万能和弦字典 (Universal Chord Dictionary)
*   **全类型覆盖**：支持查询任意根音的 30+ 种和弦类型。
*   **和弦类型**：
    *   三和弦：Major, minor, dim, aug, sus2, sus4
    *   七和弦：maj7, m7, 7 (Dom), m7b5, dim7, mM7
    *   延伸和弦：9, maj9, m9, 11, 13
    *   变化和弦：7#9 (Hendrix Chord), 7b9 等
*   **实时计算**：基于乐理公式实时计算构成音，不依赖死板的数据库。

## 🛠 技术栈

### Backend (后端)
*   **Python 3**
*   **FastAPI**: 高性能 Web 框架。
*   **Uvicorn**: ASGI 服务器。
*   **Pydantic**: 数据验证。

### Frontend (前端)
*   **React 18**
*   **Vite**: 极速构建工具。
*   **Tailwind CSS**: 现代化的 UI 样式库。
*   **VexFlow**: 专业的五线谱渲染引擎。
*   **KaTeX**: 数学/音乐符号渲染。
*   **Axios**: API 请求。
*   **html2canvas & jsPDF**: PDF 导出功能。

## 🚀 快速开始

### 1. 克隆仓库
```bash
git clone https://github.com/Gonghysin/music_theory_app.git
cd music_theory_app
```

### 2. 启动后端
```bash
cd backend
# 创建并激活虚拟环境 (可选)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务器
uvicorn main:app --reload
```
后端服务将在 `http://localhost:8000` 运行。

### 3. 启动前端
```bash
cd frontend
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```
前端页面将在 `http://localhost:5173` 运行。

## 📝 开发计划
- [x] 基础调性分析
- [x] VexFlow 五线谱渲染
- [x] 顺阶七和弦支持
- [x] 万能和弦字典
- [x] 和弦走向编辑器 (Jam Mode)
- [x] PDF 乐谱导出
- [ ] MIDI 播放支持 (点击和弦发声)
- [ ] 更多音阶类型 (旋律小调、和声小调、教会调式)

## 📄 License
MIT License

