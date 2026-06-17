class FileManager {
    constructor() {
        this.files = [];
        this.currentIndex = -1;
        this.labelFolder = null;
        this.currentData = null;
        this.initEventListeners();
    }

    initEventListeners() {
        const uploadSingleBtn = document.getElementById('uploadSingleBtn');
        const uploadFolderBtn = document.getElementById('uploadFolderBtn');
        const fileInput = document.getElementById('fileInput');
        const folderInput = document.getElementById('folderInput');
        const dropZone = document.getElementById('dropZone');
        const prevFileBtn = document.getElementById('prevFileBtn');
        const nextFileBtn = document.getElementById('nextFileBtn');
        const selectLabelFolderBtn = document.getElementById('selectLabelFolderBtn');
        const labelFolderInput = document.getElementById('labelFolderInput');
        const fileSelector = document.getElementById('fileSelector');

        uploadSingleBtn.addEventListener('click', () => fileInput.click());
        uploadFolderBtn.addEventListener('click', () => folderInput.click());
        selectLabelFolderBtn.addEventListener('click', () => labelFolderInput.click());

        fileInput.addEventListener('change', (e) => this.handleSingleFileUpload(e));
        folderInput.addEventListener('change', (e) => this.handleFolderUpload(e));
        labelFolderInput.addEventListener('change', (e) => this.handleLabelFolderSelect(e));

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleDrop(e);
        });

        prevFileBtn.addEventListener('click', () => this.navigateFile(-1));
        nextFileBtn.addEventListener('click', () => this.navigateFile(1));
        fileSelector.addEventListener('change', (e) => this.handleFileSelectorChange(e));
    }

    handleSingleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.json')) {
            this.loadFile(file);
        }
    }

    handleFolderUpload(event) {
        const files = Array.from(event.target.files).filter(f => f.name.endsWith('.json'));
        if (files.length > 0) {
            this.files = files;
            this.currentIndex = 0;
            // 清空孕妇信息缓存，确保重新加载时获取最新数据
            if (this.patientInfoManager) {
                this.patientInfoManager.clearCache();
                console.log('缓存已清空');
            } else if (window.app && window.app.patientInfoManager) {
                window.app.patientInfoManager.clearCache();
                console.log('缓存已清空（通过window.app）');
            } else {
                console.log('无法清空缓存，patientInfoManager不存在');
            }
            this.loadFile(files[0]);
        }
    }

    handleDrop(event) {
        const file = event.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            this.loadFile(file);
        }
    }

    handleLabelFolderSelect(event) {
        const files = Array.from(event.target.files).filter(f => f.name.endsWith('.json'));
        if (files.length > 0) {
            this.labelFolder = files;
            const folderPath = files[0].webkitRelativePath.split('/')[0];
            document.getElementById('labelFolderPath').textContent = folderPath;
            console.log('标签文件夹已选择，包含', files.length, '个标签文件');
            
            // 选择标签文件夹后，自动重新加载当前文件的标注数据
            const currentFileName = this.getCurrentFileName();
            if (currentFileName) {
                // 触发文件加载事件，重新加载标注数据
                if (this.currentData) {
                    this.notifyFileLoaded(this.currentData, currentFileName);
                }
            }
        }
    }

    async getLabelFileContent(fileName) {
        if (!this.labelFolder) return null;
        
        // 查找对应的标签文件，支持两种命名格式：label_原始文件名 和 原始文件名
        const labelFile = this.labelFolder.find(f => 
            f.name === `label_${fileName}` || f.name === fileName
        );
        
        if (labelFile) {
            try {
                const text = await labelFile.text();
                return JSON.parse(text);
            } catch (error) {
                console.error('读取标签文件失败:', error);
                return null;
            }
        }
        return null;
    }

    async loadFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            this.currentData = data;
            
            if (this.files.length === 0) {
                this.files = [file];
                this.currentIndex = 0;
            }
            
            this.updateFileNameDisplay();
            this.notifyFileLoaded(data, file.name);
        } catch (error) {
            console.error('Error loading file:', error);
            alert('文件加载失败，请确保是有效的JSON格式');
        }
    }

    navigateFile(direction) {
        if (this.files.length === 0) return;

        this.currentIndex += direction;

        if (this.currentIndex < 0) {
            this.currentIndex = this.files.length - 1;
        } else if (this.currentIndex >= this.files.length) {
            this.currentIndex = 0;
        }

        this.loadFile(this.files[this.currentIndex]);
    }

    updateFileNameDisplay() {
        const fileNameElement = document.getElementById('currentFileName');
        const fileSelector = document.getElementById('fileSelector');
        
        // 更新文件名显示
        if (this.files.length > 0 && this.currentIndex >= 0) {
            fileNameElement.textContent = `${this.files[this.currentIndex].name} (${this.currentIndex + 1}/${this.files.length})`;
        } else {
            fileNameElement.textContent = '未选择文件';
        }
        
        // 更新文件选择器下拉列表
        this.updateFileSelector();
    }
    
    updateFileSelector() {
        const fileSelector = document.getElementById('fileSelector');
        fileSelector.innerHTML = '';
        
        if (this.files.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '请选择文件';
            fileSelector.appendChild(option);
        } else {
            this.files.forEach((file, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = file.name;
                if (index === this.currentIndex) {
                    option.selected = true;
                }
                fileSelector.appendChild(option);
            });
        }
    }
    
    handleFileSelectorChange(event) {
        const selectedIndex = parseInt(event.target.value);
        if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < this.files.length) {
            this.currentIndex = selectedIndex;
            this.loadFile(this.files[selectedIndex]);
        }
    }

    getCurrentData() {
        return this.currentData;
    }

    getCurrentFileName() {
        if (this.files.length > 0 && this.currentIndex >= 0) {
            return this.files[this.currentIndex].name;
        }
        return null;
    }

    getLabelFile(fileName) {
        if (!this.labelFolder) return null;
        return this.labelFolder.find(f => f.name === fileName);
    }

    notifyFileLoaded(data, fileName) {
        const event = new CustomEvent('fileLoaded', {
            detail: { data, fileName }
        });
        window.dispatchEvent(event);
    }

    saveLabelData(fileName, labelData) {
        const cacheKey = `label_${fileName}`;
        localStorage.setItem(cacheKey, JSON.stringify(labelData));
    }

    getLabelData(fileName) {
        const cacheKey = `label_${fileName}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    }

    exportLabelData(fileName) {
        const labelData = this.getLabelData(fileName);
        const reportData = window.annotationManager.getReportData();
        if (!labelData && !reportData) {
            alert('没有可导出的标注数据和报告数据');
            return null;
        }

        const blob = new Blob([JSON.stringify(labelData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `label_${fileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return labelData;
    }
}