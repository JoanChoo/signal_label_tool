class App {
    constructor() {
        this.fileManager = new FileManager();
        this.signalRenderer = new SignalRenderer('signalCanvas');
        this.annotationManager = new AnnotationManager(this.signalRenderer);
        this.patientInfoManager = new PatientInfoManager();
        
        this.currentIdentity = null;
        
        this.init();
    }

    init() {
        this.initIdentityListener();
        this.initFileLoadedListener();
        this.initExportListener();
        this.checkIdentity();
    }

    initIdentityListener() {
        const identitySelect = document.getElementById('identitySelect');
        identitySelect.addEventListener('change', (e) => {
            this.currentIdentity = e.target.value;
            this.annotationManager.setIdentity(this.currentIdentity);
            this.enableFeatures();
        });
    }

    initFileLoadedListener() {
        window.addEventListener('fileLoaded', (e) => {
            this.handleFileLoaded(e.detail.data, e.detail.fileName);
        });
    }

    initExportListener() {
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.annotationManager.exportAnnotations();
        });
    }

    checkIdentity() {
        const identitySelect = document.getElementById('identitySelect');
        if (!identitySelect.value) {
            this.disableFeatures();
        }
    }

    enableFeatures() {
        const buttons = document.querySelectorAll('.annotation-btn, .annotation-actions button, .report-form input, .report-form select, .report-form textarea');
        buttons.forEach(btn => {
            btn.disabled = false;
        });
    }

    disableFeatures() {
        const buttons = document.querySelectorAll('.annotation-btn, .annotation-actions button:not(#exportBtn), .report-form input, .report-form select, .report-form textarea');
        buttons.forEach(btn => {
            btn.disabled = true;
        });
    }

    async handleFileLoaded(data, fileName) {
        if (!this.currentIdentity) {
            alert('请先选择身份才能进行操作');
            return;
        }

        const fhrData = data.fhr || [];
        const ucData = data.uc || [];

        this.signalRenderer.setData(fhrData, ucData);
        this.patientInfoManager.loadPatientInfo(data, fileName);
        // 先加载报告数据，再加载标注数据
        this.patientInfoManager.loadReportData(fileName);
        await this.annotationManager.loadAnnotations(fileName);
    }

    getCurrentIdentity() {
        return this.currentIdentity;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.fileManager = window.app.fileManager;
    window.annotationManager = window.app.annotationManager;
    // 确保fileManager能够访问到patientInfoManager
    window.fileManager.patientInfoManager = window.app.patientInfoManager;
});