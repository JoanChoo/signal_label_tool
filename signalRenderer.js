class SignalRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.fhrData = [];
        this.ucData = [];
        this.annotations = [];
        
        this.zoomLevel = 0.3;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.startX = 0;
        this.startY = 0;
        this.isClick = false;
        
        this.FHR_Y_MAX = 220;
        this.FHR_Y_STEP = 30;
        this.UC_Y_MAX = 150;
        this.UC_Y_STEP = 25;
        this.SAMPLING_FREQUENCY = 4; // 采样频率为4Hz
        this.TIME_STEP = 60 * this.SAMPLING_FREQUENCY; // 1分钟对应的样本数
        
        this.initCanvas();
        this.initEventListeners();
    }

    initCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.render();
    }

    initEventListeners() {
        if (!this.canvas) return;
        
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // 存储鼠标位置
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.lastMouseX = e.clientX - rect.left;
            this.lastMouseY = e.clientY - rect.top;
            if (!this.isDragging) { // 只有在非拖拽状态下才重新渲染，避免影响点击操作
                this.render(); // 鼠标移动时重新渲染，以更新竖线位置
            }
        });

        // 安全地添加按钮事件监听器
        document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoomIn(this.lastMouseX, this.lastMouseY));
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoomOut(this.lastMouseX, this.lastMouseY));
        document.getElementById('resetZoomBtn')?.addEventListener('click', () => this.resetZoom());
    }

    handleMouseDown(e) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.isClick = true;
        this.canvas.style.cursor = 'grabbing';
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.lastX;
            const deltaY = e.clientY - this.lastY;
            this.offsetX += deltaX;
            this.offsetY += deltaY;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            
            if (Math.abs(e.clientX - this.startX) > 5 || Math.abs(e.clientY - this.startY) > 5) {
                this.isClick = false;
            }
            
            this.render();
            this.updatePositionIndicator();
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'crosshair';
    }

    isClickOperation() {
        return this.isClick;
    }

    resetClickState() {
        this.isClick = false;
    }

    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        if (e.deltaY < 0) {
            this.zoomIn(mouseX, mouseY);
        } else {
            this.zoomOut(mouseX, mouseY);
        }
    }

    zoomIn(mouseX, mouseY) {
        const newZoomLevel = Math.min(this.zoomLevel * 1.2, 5);
        this.adjustOffsetForZoom(mouseX, mouseY, newZoomLevel);
        this.zoomLevel = newZoomLevel;
        this.render();
    }

    zoomOut(mouseX, mouseY) {
        const newZoomLevel = Math.max(this.zoomLevel / 1.2, 0.2);
        this.adjustOffsetForZoom(mouseX, mouseY, newZoomLevel);
        this.zoomLevel = newZoomLevel;
        this.render();
    }

    adjustOffsetForZoom(mouseX, mouseY, newZoomLevel) {
        const scaleFactor = newZoomLevel / this.zoomLevel;
        
        // 调整偏移量，确保鼠标位置在缩放后保持不变
        this.offsetX = (this.offsetX - mouseX) * scaleFactor + mouseX;
        this.offsetY = (this.offsetY - mouseY) * scaleFactor + mouseY;
    }

    resetZoom() {
        this.zoomLevel = 0.3;
        this.offsetX = 0;
        this.offsetY = 0;
        this.render();
        this.updatePositionIndicator();
    }

    updatePositionIndicator() {
        const dataLength = Math.max(this.fhrData.length, this.ucData.length);
        const totalWidth = dataLength * this.zoomLevel;
        const viewWidth = this.canvas.parentElement.clientWidth;
        const position = Math.abs(this.offsetX) / (totalWidth - viewWidth) * 100;
        const clampedPosition = Math.max(0, Math.min(100, position));
        document.getElementById('positionIndicator').textContent = `位置: ${clampedPosition.toFixed(1)}%`;
    }

    setData(fhrData, ucData) {
        this.fhrData = fhrData || [];
        this.ucData = ucData || [];
        this.offsetX = 0;
        this.offsetY = 0;
        this.render();
    }

    setAnnotations(annotations) {
        this.annotations = annotations || [];
        this.render();
    }

    render() {
        const ctx = this.ctx;
        const container = this.canvas.parentElement;
        // 计算画布宽度：根据数据长度
        const dataLength = Math.max(this.fhrData.length, this.ucData.length);
        const canvasWidth = dataLength;
        
        const padding = { left: 40, right: 20, top: 20, bottom: 40 };
        const plotWidth = canvasWidth - padding.left - padding.right;
        
        // 一分钟对应的像素数（采样率4Hz，60秒=240个采样点）
        const pixelsPerMinute = 240;
        
        // 计算FHR图高度：240像素宽度（1分钟）对应90bpm的高度
        const fhrPixelsPerBpm = pixelsPerMinute / 90;
        const fhrPlotHeight = this.FHR_Y_MAX * fhrPixelsPerBpm;
        
        // 计算UC图高度：240像素宽度（1分钟）对应75mmHg的高度
        const ucPixelsPerMmHg = pixelsPerMinute / 75;
        const ucPlotHeight = this.UC_Y_MAX * ucPixelsPerMmHg;
        
        // 总画布高度
        const fixedCanvasHeight = fhrPlotHeight + ucPlotHeight + padding.top * 2 + padding.bottom * 2;
        
        this.canvas.width = canvasWidth;
        this.canvas.height = fixedCanvasHeight;
        
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.clearRect(0, 0, width, height);

        if (this.fhrData.length === 0 && this.ucData.length === 0) {
            this.drawEmptyState();
            return;
        }

        // 根据纵横比计算 FHR 和 UC 的高度
        const fhrHeight = fhrPlotHeight + padding.top + padding.bottom;
        const ucHeight = ucPlotHeight + padding.top + padding.bottom;

        ctx.save();
        
        // 应用平移和缩放变换，实现像图片一样的拖拽和缩放
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.zoomLevel, this.zoomLevel);

        this.drawFHR(ctx, 0, 0, width, fhrHeight);
        this.drawUC(ctx, 0, fhrHeight, width, ucHeight);
        this.drawAnnotations(ctx, width, height, fhrHeight, fhrPlotHeight, ucPlotHeight);
        
        ctx.restore();
        this.drawVerticalLine(ctx); // 绘制实时竖线
        this.updatePositionIndicator();
    }

    drawEmptyState() {
        const ctx = this.ctx;
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('请加载信号数据', this.canvas.width / 2, this.canvas.height / 2);
    }

    drawGrid(ctx, startX, startY, width, height, yMax, yStep, isFHR) {
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;

        const xStep = 40;
        const majorXStep = this.TIME_STEP;
        const signalLength = Math.max(this.fhrData.length, this.ucData.length);
        
        // 计算绘制范围，确保覆盖整个画布和可能的拖拽区域
        const drawWidth = Math.max(width, signalLength); // 添加额外的宽度以支持拖拽

        // 绘制垂直网格线
        for (let i = 0; i <= drawWidth; i += xStep) {
            const x = startX + i;
            
            if (i % majorXStep === 0) {
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = '#ccc';
                ctx.lineWidth = 1;
            }

            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, startY + height);
            ctx.stroke();
        }

        const minorYStep = isFHR ? 10 : 5;

        // 绘制水平网格线
        for (let i = 0; i <= yMax; i += minorYStep) {
            if (i % yStep === 0) {
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = '#ccc';
                ctx.lineWidth = 1;
            }

            const y = startY + height - (i / yMax) * height;
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(startX + drawWidth, y);
            ctx.stroke();
        }
    }

    drawAxisLabels(ctx, startX, startY, width, height, yMax, yStep, yLabel, isFHR) {
        ctx.fillStyle = '#333';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';

        const signalLength = Math.max(this.fhrData.length, this.ucData.length);
        const drawWidth = Math.max(width, signalLength); // 添加额外的宽度以支持拖拽
        
        // 计算起始点，确保是TIME_STEP的整数倍
        const firstStep = 0;

        for (let i = firstStep; i <= drawWidth; i += this.TIME_STEP) {
            const x = startX + i;
            const minutes = Math.floor(i / this.TIME_STEP);
            ctx.fillText(minutes.toString(), x, startY + height+35);
            if (i % (4 * this.TIME_STEP) === 0) {
                ctx.textAlign = 'center';
                for (let j = yStep; j <= yMax; j += yStep) {
                    const y = startY + height - (j / yMax) * height;
                    ctx.fillStyle = 'white';
                    ctx.fillRect(x - 30, y -15, 60, 30);
                    ctx.fillStyle = '#333';
                    ctx.fillText(j.toString(), x, y + 14);
                }
            }
        }
        


        ctx.textAlign = 'left';
        ctx.font = 'bold 40px Arial';
        ctx.fillText('Time (min)', startX + width / 2 - 40, startY + height +30);
        
        ctx.save();
        ctx.translate(startX + 10, startY + height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yLabel, -100, 0);
        ctx.restore();
    }

    drawFHR(ctx, startX, startY, width, height) {
        if (this.fhrData.length === 0) return;

        ctx.save();
        
        const padding = { left: 40, right: 20, top: 20, bottom: 40 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;

        this.drawGrid(ctx, startX + padding.left, startY + padding.top, plotWidth, plotHeight, this.FHR_Y_MAX, this.FHR_Y_STEP, true);
        this.drawAxisLabels(ctx, startX + padding.left, startY + padding.top, plotWidth, plotHeight, this.FHR_Y_MAX, this.FHR_Y_STEP, 'FHR (bpm)', true);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        ctx.beginPath();
        for (let i = 0; i < this.fhrData.length; i++) {
            const x = startX + padding.left + i;
            const y = startY + padding.top + plotHeight - (this.fhrData[i] / this.FHR_Y_MAX) * plotHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        ctx.restore();
    }

    drawUC(ctx, startX, startY, width, height) {
        if (this.ucData.length === 0) return;

        ctx.save();
        
        const padding = { left: 40, right: 20, top: 20, bottom: 40 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;

        this.drawGrid(ctx, startX + padding.left, startY + padding.top, plotWidth, plotHeight, this.UC_Y_MAX, this.UC_Y_STEP, false);
        this.drawAxisLabels(ctx, startX + padding.left, startY + padding.top, plotWidth, plotHeight, this.UC_Y_MAX, this.UC_Y_STEP, 'UC (mmHg)', false);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        ctx.beginPath();
        for (let i = 0; i < this.ucData.length; i++) {
            const x = startX + padding.left + i;
            const y = startY + padding.top + plotHeight - (this.ucData[i] / this.UC_Y_MAX) * plotHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        ctx.restore();
    }

    drawAnnotations(ctx, width, height, fhrHeight, fhrPlotHeight, ucPlotHeight) {
        const padding = { left: 40, right: 20, top: 20, bottom: 40 };

        const colors = {
            acceleration: 'rgba(76, 175, 80, 0.3)',
            earlyDeceleration: 'rgba(33, 150, 243, 0.3)',
            lateDeceleration: 'rgba(255, 152, 0, 0.3)',
            prolongedDeceleration: 'rgba(156, 39, 176, 0.3)',
            variableDeceleration: 'rgba(244, 67, 54, 0.3)',
            contraction: 'rgba(255, 235, 59, 0.3)'
        };

        this.annotations.forEach(annotation => {
            const color = colors[annotation.type] || 'rgba(128, 128, 128, 0.3)';
            const startX = padding.left + annotation.startIndex;
            const endX = padding.left + annotation.endIndex;
            const annotationWidth = endX - startX;

            if (annotation.type === 'contraction') {
                ctx.fillStyle = color;
                ctx.fillRect(startX, fhrHeight + padding.top, annotationWidth, ucPlotHeight);
                ctx.strokeStyle = color.replace('0.3', '0.8');
                ctx.lineWidth = 2;
                ctx.strokeRect(startX, fhrHeight + padding.top, annotationWidth, ucPlotHeight);
            } else {
                ctx.fillStyle = color;
                ctx.fillRect(startX, padding.top, annotationWidth, fhrPlotHeight);
                ctx.strokeStyle = color.replace('0.3', '0.8');
                ctx.lineWidth = 2;
                ctx.strokeRect(startX, padding.top, annotationWidth, fhrPlotHeight);
            }
        });
    }

    getDataIndexFromX(x) {
        const padding = { left: 40, right: 20, top: 20, bottom: 40 };
        
        const transformedX = (x - this.offsetX) / this.zoomLevel;
        
        return Math.floor(transformedX - padding.left);
    }

    getXFromDataIndex(index) {
        const padding = { left: 40, right: 20, top: 20, bottom: 40 };
        
        const originalX = padding.left + index;
        const transformedX = originalX * this.zoomLevel + this.offsetX;
        
        return transformedX;
    }

    drawVerticalLine(ctx) {
        // 绘制实时竖线
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.lastMouseX, 0);
        ctx.lineTo(this.lastMouseX, this.canvas.height);
        ctx.stroke();
    }
}