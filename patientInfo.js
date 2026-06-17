class PatientInfoManager {
    constructor() {
        this.cachedInfo = new Map();
        this.initReportListeners();
    }

    initReportListeners() {
        const reportInputs = document.querySelectorAll('.report-form input, .report-form select, .report-form textarea');
        reportInputs.forEach(input => {
            input.addEventListener('change', () => this.saveReportData());
            input.addEventListener('input', () => this.saveReportData());
        });
        
        // 减速类型限制逻辑：选择了无就不能选择其他三个选项
        const decelerationNone = document.getElementById('decelerationNone');
        const decelerationOptions = [
            document.getElementById('decelerationEarly'),
            document.getElementById('decelerationVariable'),
            document.getElementById('decelerationLate')
        ];
        
        // 当选择"无"时，取消选择其他选项
        decelerationNone.addEventListener('change', () => {
            if (decelerationNone.checked) {
                decelerationOptions.forEach(option => {
                    option.checked = false;
                });
                this.saveReportData();
            }
        });
        
        // 当选择其他选项时，取消选择"无"
        decelerationOptions.forEach(option => {
            option.addEventListener('change', () => {
                if (option.checked) {
                    decelerationNone.checked = false;
                    this.saveReportData();
                }
            });
        });
    }

    loadPatientInfo(data, fileName) {
        if (!fileName) {
            fileName = window.fileManager.getCurrentFileName();
        }
        
        if (this.cachedInfo.has(fileName)) {
            this.displayPatientInfo(this.cachedInfo.get(fileName));
            return;
        }

        const patientInfo = this.extractPatientInfo(data);
        this.cachedInfo.set(fileName, patientInfo);
        this.displayPatientInfo(patientInfo);
    }

    extractPatientInfo(data) {
        const isNotNull = (value) => value !== null && value !== undefined && value !== 'null';
        
        return {
            age: isNotNull(data.Age) ? data.Age : '-',
            week: isNotNull(data.Week) ? `${data.Week}周` : '-',
            pregnancyNumber: isNotNull(data.Gravidity) ? data.Gravidity : '-',
            deliveriesNumber: isNotNull(data.Parity) ? data.Parity : '-',
            diabetesType: isNotNull(data.Diabetes) ? (data.Diabetes === 1 ? '有' : '无') : '-',
            hypertension: isNotNull(data.Hypertension) ? (data.Hypertension === 1 ? '有' : '无') : '-',
            preeclampsia: isNotNull(data.Preeclampsia) ? (data.Preeclampsia === 1 ? '有' : '无') : '-',
            frontBmi: isNotNull(data.FrontBmi) && !isNaN(parseFloat(data.FrontBmi)) ? parseFloat(data.FrontBmi).toFixed(1) : '-',
            frontHeight: isNotNull(data.FrontHeight) ? `${data.FrontHeight}cm` : '-',
            frontWeight: isNotNull(data.FrontWeight) ? `${data.FrontWeight}kg` : '-',
            thyroid: isNotNull(data.Thyroid_disease) ? (data.Thyroid_disease === 1 ? '有' : '无') : '-',
            anemia: isNotNull(data.Thalassemia) ? (data.Thalassemia === 1 ? '有' : '无') : '-',
            fibroid: isNotNull(data.Uterine_fibroids) ? (data.Uterine_fibroids === 1 ? '有' : '无') : '-',
            cyst: isNotNull(data.Ovarian_cysts) ? (data.Ovarian_cysts === 1 ? '有' : '无') : '-',
            scar: isNotNull(data.Scarred_uterus) ? (data.Scarred_uterus === 1 ? '有' : '无') : '-',
            cord: isNotNull(data.Nuchal_cord_loops) ? (data.Nuchal_cord_loops === 1 ? '有' : '无') : '-'
        };
    }

    displayPatientInfo(info) {
        document.getElementById('age').textContent = info.age;
        document.getElementById('week').textContent = info.week;
        document.getElementById('pregnancyNumber').textContent = info.pregnancyNumber;
        document.getElementById('deliveriesNumber').textContent = info.deliveriesNumber;
        document.getElementById('diabetesType').textContent = info.diabetesType;
        document.getElementById('hypertension').textContent = info.hypertension;
        document.getElementById('preeclampsia').textContent = info.preeclampsia;
        document.getElementById('frontBmi').textContent = info.frontBmi;
        document.getElementById('frontHeight').textContent = info.frontHeight;
        document.getElementById('frontWeight').textContent = info.frontWeight;
        document.getElementById('thyroid').textContent = info.thyroid;
        document.getElementById('anemia').textContent = info.anemia;
        document.getElementById('fibroid').textContent = info.fibroid;
        document.getElementById('cyst').textContent = info.cyst;
        document.getElementById('scar').textContent = info.scar;
        document.getElementById('cord').textContent = info.cord;
    }

    saveReportData() {
        const fileName = window.fileManager.getCurrentFileName();
        if (!fileName) return;

        const getRadioValue = (name) => {
            const radio = document.querySelector(`input[name="${name}"]:checked`);
            return radio ? radio.value : '';
        };

        const reportData = {
            examType: getRadioValue('examType'),
            baselineFHR: document.getElementById('baselineFHR').value,
            baselineVariability: getRadioValue('baselineVariability'),
            acceleration: getRadioValue('acceleration'),
            deceleration: {
                none: document.getElementById('decelerationNone').checked,
                early: document.getElementById('decelerationEarly').checked,
                variable: document.getElementById('decelerationVariable').checked,
                late: document.getElementById('decelerationLate').checked
            },
            contraction: getRadioValue('contraction'),
            conclusion: getRadioValue('conclusion'),
            freeText: document.getElementById('freeText').value
        };

        const cacheKey = `report_${fileName}`;
        localStorage.setItem(cacheKey, JSON.stringify(reportData));
    }

    loadReportData(fileName) {
        const cacheKey = `report_${fileName}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            const reportData = JSON.parse(cached);
            this.displayReportData(reportData);
        } else {
            // 如果没有找到报告数据，清空报告信息
            this.clearReportData();
        }
    }

    displayReportData(reportData) {
        if (reportData.baselineFHR) document.getElementById('baselineFHR').value = reportData.baselineFHR;
        
        const setRadioValue = (name, value) => {
            const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (radio) radio.checked = true;
        };
        
        if (reportData.examType) setRadioValue('examType', reportData.examType);
        if (reportData.baselineVariability) setRadioValue('baselineVariability', reportData.baselineVariability);
        if (reportData.acceleration) setRadioValue('acceleration', reportData.acceleration);
        
        if (reportData.deceleration) {
            document.getElementById('decelerationNone').checked = reportData.deceleration.none || false;
            document.getElementById('decelerationEarly').checked = reportData.deceleration.early || false;
            document.getElementById('decelerationVariable').checked = reportData.deceleration.variable || false;
            document.getElementById('decelerationLate').checked = reportData.deceleration.late || false;
        }
        
        if (reportData.contraction) setRadioValue('contraction', reportData.contraction);
        if (reportData.conclusion) setRadioValue('conclusion', reportData.conclusion);
        if (reportData.freeText) document.getElementById('freeText').value = reportData.freeText;
    }

    clearPatientInfo() {
        const fields = ['age', 'week', 'pregnancyNumber', 'deliveriesNumber', 'diabetesType', 
                       'hypertension', 'preeclampsia', 'frontBmi', 'frontHeight', 'frontWeight',
                       'thyroid', 'anemia', 'fibroid', 'cyst', 'scar', 'cord'];
        
        fields.forEach(field => {
            document.getElementById(field).textContent = '-';
        });
    }

    clearReportData() {
        document.getElementById('baselineFHR').value = '';
        
        // 清空单选按钮
        const clearRadioGroup = (name) => {
            const radios = document.querySelectorAll(`input[name="${name}"]`);
            radios.forEach(radio => {
                radio.checked = false;
            });
        };
        
        clearRadioGroup('examType');
        clearRadioGroup('baselineVariability');
        clearRadioGroup('acceleration');
        clearRadioGroup('contraction');
        clearRadioGroup('conclusion');
        
        // 清空复选框
        document.getElementById('decelerationNone').checked = false;
        document.getElementById('decelerationEarly').checked = false;
        document.getElementById('decelerationVariable').checked = false;
        document.getElementById('decelerationLate').checked = false;
        
        // 清空文本域
        document.getElementById('freeText').value = '';
    }

    getCachedInfo(fileName) {
        return this.cachedInfo.get(fileName);
    }

    clearCache() {
        this.cachedInfo.clear();
    }
}