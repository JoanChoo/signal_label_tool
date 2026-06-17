class AnnotationManager {
    constructor(signalRenderer) {
        this.signalRenderer = signalRenderer;
        this.annotations = [];
        this.deletedAnnotations = [];
        this.currentType = null;
        this.isCreating = false;
        this.startIndex = null;
        this.currentIdentity = null;
        this.tempAnnotation = null;
        this.initEventListeners();
    }

    initEventListeners() {
        const canvas = this.signalRenderer.canvas;

        canvas.addEventListener('click', (e) => this.handleClick(e));

        const annotationBtns = document.querySelectorAll('.annotation-btn');
        annotationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.selectAnnotationType(e));
        });

        document.getElementById('deleteAnnotationBtn').addEventListener('click', () => this.deleteSelectedAnnotation());
        document.getElementById('undoDeleteBtn').addEventListener('click', () => this.undoDelete());
    }

    selectAnnotationType(event) {
        const btn = event.target;
        const type = btn.dataset.type;

        // 切换标注类型时重置创建状态
        this.isCreating = false;
        this.startIndex = null;
        this.tempAnnotation = null;

        if (this.currentType === type) {
            this.currentType = null;
            btn.classList.remove('active');
        } else {
            document.querySelectorAll('.annotation-btn').forEach(b => b.classList.remove('active'));
            this.currentType = type;
            btn.classList.add('active');
        }
    }

    setIdentity(identity) {
        this.currentIdentity = identity;
    }

    handleClick(e) {
        console.log('=== 点击事件开始 ===');
        console.log('当前状态 - isCreating:', this.isCreating, 'startIndex:', this.startIndex);
        
        if (!this.currentIdentity) {
            console.log('无身份标识，返回');
            return;
        }

        if (!this.signalRenderer.isClickOperation()) {
            console.log('不是点击操作，重置状态并返回');
            this.signalRenderer.resetClickState();
            return;
        }

        this.signalRenderer.resetClickState();

        const rect = this.signalRenderer.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const currentIndex = this.signalRenderer.getDataIndexFromX(x);
        console.log('当前点击位置索引:', currentIndex);
        
        const clickedAnnotation = this.findAnnotationAtPosition(x, y);
        console.log('是否点击了现有标注:', clickedAnnotation ? true : false);

        if (clickedAnnotation) {
            console.log('点击了现有标注，删除并重置状态');
            this.confirmDeleteAnnotation(clickedAnnotation);
            // 确保重置创建状态，避免删除标注后影响后续标注
            this.isCreating = false;
            this.startIndex = null;
            this.tempAnnotation = null;
            console.log('删除标注后状态 - isCreating:', this.isCreating, 'startIndex:', this.startIndex);
            return;
        }

        if (!this.currentType) {
            console.log('未选择标注类型，返回');
            return;
        }

        if (!this.isCreating) {
            console.log('开始新标注，设置起点');
            // 确保重置所有状态变量，避免之前的状态影响
            this.isCreating = true;
            this.startIndex = currentIndex;
            this.tempAnnotation = {
                type: this.currentType,
                startIndex: currentIndex,
                endIndex: currentIndex,
                creator: this.currentIdentity,
                timestamp: new Date().toISOString()
            };
            
            const tempAnnotations = [...this.annotations, this.tempAnnotation];
            this.signalRenderer.setAnnotations(tempAnnotations);
            console.log('设置起点后状态 - isCreating:', this.isCreating, 'startIndex:', this.startIndex);
        } else {
            console.log('完成标注，设置终点');
            console.log('当前startIndex:', this.startIndex, 'currentIndex:', currentIndex);
            if (Math.abs(currentIndex - this.startIndex) > 5) {
                const newAnnotation = {
                    id: Date.now(),
                    type: this.currentType,
                    startIndex: Math.min(this.startIndex, currentIndex),
                    endIndex: Math.max(this.startIndex, currentIndex),
                    creator: this.currentIdentity,
                    timestamp: new Date().toISOString()
                };

                this.annotations.push(newAnnotation);
                this.signalRenderer.setAnnotations(this.annotations);
                try {
                    this.saveAnnotations();
                    console.log('创建标注成功，起点:', Math.min(this.startIndex, currentIndex), '终点:', Math.max(this.startIndex, currentIndex));
                } catch (error) {
                    console.error('保存标注时出错:', error);
                }
            } else {
                this.signalRenderer.setAnnotations(this.annotations);
                console.log('标注距离过短，取消创建');
            }

            // 确保重置所有状态变量，为下一次标注做准备
            this.isCreating = false;
            this.startIndex = null;
            this.tempAnnotation = null;
            console.log('完成标注后状态 - isCreating:', this.isCreating, 'startIndex:', this.startIndex);
        }
        console.log('=== 点击事件结束 ===');
    }

    findAnnotationAtPosition(x, y) {
        const padding = { left: 40, right: 20, top: 20, bottom: 40 };
        
        // 使用与getDataIndexFromX相同的方式计算transformedX
        const transformedX = (x - this.signalRenderer.offsetX) / this.signalRenderer.zoomLevel;
        const transformedY = (y - this.signalRenderer.offsetY) / this.signalRenderer.zoomLevel;

        // 计算FHR和UC的实际绘制高度（与signalRenderer.js保持一致）
        const pixelsPerMinute = 240; // 一分钟对应的像素数（采样率4Hz，60秒=240个采样点）
        
        // 计算FHR图高度：240像素宽度（1分钟）对应90bpm的高度
        const fhrPixelsPerBpm = pixelsPerMinute / 90;
        const fhrPlotHeight = this.signalRenderer.FHR_Y_MAX * fhrPixelsPerBpm;
        
        // 计算UC图高度：240像素宽度（1分钟）对应75mmHg的高度
        const ucPixelsPerMmHg = pixelsPerMinute / 75;
        const ucPlotHeight = this.signalRenderer.UC_Y_MAX * ucPixelsPerMmHg;
        
        // 计算FHR和UC的总高度
        const fhrHeight = fhrPlotHeight + padding.top + padding.bottom;
        const ucStartY = fhrHeight;

        // 先判断点击的是FHR区域还是UC区域
        const isFHRRegion = transformedY >= padding.top && transformedY <= padding.top + fhrPlotHeight;
        const isUCRegion = transformedY >= ucStartY + padding.top && transformedY <= ucStartY + padding.top + ucPlotHeight;

        // 根据点击的区域类型，分别查找对应的标注
        for (let i = this.annotations.length - 1; i >= 0; i--) {
            const annotation = this.annotations[i];
            const startX = padding.left + annotation.startIndex;
            const endX = padding.left + annotation.endIndex;

            if (transformedX >= startX && transformedX <= endX) {
                if (isFHRRegion && annotation.type !== 'contraction') {
                    return annotation;
                }
                if (isUCRegion && annotation.type === 'contraction') {
                    return annotation;
                }
            }
        }
        return null;
    }

    getClickPosition(x, startX, endX, threshold, annotation) {
        const distanceToStart = Math.abs(x - startX);
        const distanceToEnd = Math.abs(x - endX);

        if (distanceToStart <= threshold && distanceToEnd <= threshold) {
            return { annotation, clickType: 'both' };
        } else if (distanceToStart <= threshold) {
            return { annotation, clickType: 'start' };
        } else if (distanceToEnd <= threshold) {
            return { annotation, clickType: 'end' };
        } else {
            return { annotation, clickType: 'body' };
        }
    }

    confirmDeleteAnnotation(annotation) {
        const typeNames = {
            acceleration: '加速区间',
            earlyDeceleration: '早期减速区间',
            lateDeceleration: '晚期减速区间',
            prolongedDeceleration: '延长减速区间',
            variableDeceleration: '变异减速区间',
            contraction: '宫缩区间'
        };

        const typeName = typeNames[annotation.type] || annotation.type;
        

        const confirmed = confirm(`确定要删除"${typeName}"标注吗？`);

        if (confirmed) {
            const index = this.annotations.indexOf(annotation);
            if (index > -1) {
                const deletedAnnotation = this.annotations.splice(index, 1)[0];
                this.deletedAnnotations.push(deletedAnnotation);
                
                this.signalRenderer.setAnnotations(this.annotations);
                this.saveAnnotations();
            }
        }
    }

    deleteSelectedAnnotation() {
        if (this.isCreating) {
            this.isCreating = false;
            this.startIndex = null;
            this.tempAnnotation = null;
            this.signalRenderer.setAnnotations(this.annotations);
            return;
        }

        if (this.annotations.length === 0) {
            alert('没有可删除的标注');
            return;
        }

        const lastIndex = this.annotations.length - 1;
        const deletedAnnotation = this.annotations.splice(lastIndex, 1)[0];
        this.deletedAnnotations.push(deletedAnnotation);
        
        this.signalRenderer.setAnnotations(this.annotations);
        this.saveAnnotations();
    }

    undoDelete() {
        if (this.deletedAnnotations.length === 0) {
            alert('没有可恢复的标注');
            return;
        }

        const restoredAnnotation = this.deletedAnnotations.pop();
        this.annotations.push(restoredAnnotation);
        
        this.signalRenderer.setAnnotations(this.annotations);
        this.saveAnnotations();
    }

    getAnnotations() {
        return this.annotations;
    }

    setAnnotations(annotations) {
        this.annotations = annotations || [];
        this.signalRenderer.setAnnotations(this.annotations);
    }

    saveAnnotations() {
        const fileName = window.fileManager.getCurrentFileName();
        if (!fileName) return;

        const labelData = {
            fileName: fileName,
            annotations: this.annotations,
            report: this.getReportData(),
            timestamp: new Date().toISOString()
        };

        window.fileManager.saveLabelData(fileName, labelData);
    }

    async loadAnnotations(fileName) {
        try {
            // 优先从标签文件夹加载数据
            const labelFileContent = await window.fileManager.getLabelFileContent(fileName);
            if (labelFileContent && labelFileContent.annotations) {
                this.setAnnotations(labelFileContent.annotations);
                console.log('从标签文件夹加载标注数据成功');
                // 同时加载报告数据
                if (labelFileContent.report) {
                    this.loadReportData(labelFileContent.report);
                }
                return;
            }
            
            // 如果标签文件夹中没有数据，从localStorage加载
            const labelData = window.fileManager.getLabelData(fileName);
            if (labelData && labelData.annotations) {
                this.setAnnotations(labelData.annotations);
                console.log('从本地存储加载标注数据成功');
                // 同时加载报告数据
                if (labelData.report) {
                    this.loadReportData(labelData.report);
                }
            } else {
                this.setAnnotations([]);
                console.log('未找到标注数据，设置为空');
                // 不再清空报告信息，保持之前加载的报告数据
            }
        } catch (error) {
            console.error('加载标注数据时出错:', error);
            this.setAnnotations([]);
            // 不再清空报告信息，保持之前加载的报告数据
            // 可以在这里添加用户反馈，例如显示一个提示
        }
    }

    getReportData() {
        const getRadioValue = (name) => {
            const selected = document.querySelector(`input[name="${name}"]:checked`);
            return selected ? selected.value : '';
        };

        return {
            examType: getRadioValue('examType'),
            baselineFHR: document.getElementById('baselineFHR')?.value || '',
            baselineVariability: getRadioValue('baselineVariability'),
            acceleration: getRadioValue('acceleration'),
            deceleration: {
                none: document.getElementById('decelerationNone')?.checked || false,
                early: document.getElementById('decelerationEarly')?.checked || false,
                variable: document.getElementById('decelerationVariable')?.checked || false,
                late: document.getElementById('decelerationLate')?.checked || false
            },
            contraction: getRadioValue('contraction'),
            conclusion: getRadioValue('conclusion'),
            freeText: document.getElementById('freeText')?.value || ''
        };
    }

    loadReportData(reportData) {
        if (!reportData) return;

        const setRadioValue = (name, value) => {
            const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (radio) radio.checked = true;
        };

        if (reportData.examType) setRadioValue('examType', reportData.examType);
        if (reportData.baselineFHR && document.getElementById('baselineFHR')) {
            document.getElementById('baselineFHR').value = reportData.baselineFHR;
        }
        if (reportData.baselineVariability) setRadioValue('baselineVariability', reportData.baselineVariability);
        if (reportData.acceleration) setRadioValue('acceleration', reportData.acceleration);
        
        if (reportData.deceleration) {
            if (document.getElementById('decelerationNone')) {
                document.getElementById('decelerationNone').checked = reportData.deceleration.none || false;
            }
            if (document.getElementById('decelerationEarly')) {
                document.getElementById('decelerationEarly').checked = reportData.deceleration.early || false;
            }
            if (document.getElementById('decelerationVariable')) {
                document.getElementById('decelerationVariable').checked = reportData.deceleration.variable || false;
            }
            if (document.getElementById('decelerationLate')) {
                document.getElementById('decelerationLate').checked = reportData.deceleration.late || false;
            }
        }
        
        if (reportData.contraction) setRadioValue('contraction', reportData.contraction);
        if (reportData.conclusion) setRadioValue('conclusion', reportData.conclusion);
        if (reportData.freeText && document.getElementById('freeText')) {
            document.getElementById('freeText').value = reportData.freeText;
        }
    }

    exportAnnotations() {
        const fileName = window.fileManager.getCurrentFileName();
        if (!fileName) {
            alert('请先加载文件');
            return null;
        }

        const exportData = {
            fileName: fileName,
            annotations: this.annotations,
            report: this.getReportData(),
            timestamp: new Date().toISOString()
        };

        return window.fileManager.exportLabelData(fileName);
    }

    clearAnnotations() {
        this.annotations = [];
        this.deletedAnnotations = [];
        this.signalRenderer.setAnnotations([]);
    }
}