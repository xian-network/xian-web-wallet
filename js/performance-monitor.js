// Performance Monitor - tracks and reports performance metrics
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.enabled = true;
    }

    // Start timing an operation
    startTiming(operationName) {
        if (!this.enabled) return;
        
        this.metrics.set(operationName, {
            startTime: performance.now(),
            endTime: null,
            duration: null
        });
    }

    // End timing an operation
    endTiming(operationName) {
        if (!this.enabled) return;
        
        const metric = this.metrics.get(operationName);
        if (metric) {
            metric.endTime = performance.now();
            metric.duration = metric.endTime - metric.startTime;
            console.log(`⏱️ ${operationName}: ${metric.duration.toFixed(2)}ms`);
        }
    }

    // Measure async operation
    async measureAsync(operationName, asyncFunction) {
        if (!this.enabled) {
            return await asyncFunction();
        }

        this.startTiming(operationName);
        try {
            const result = await asyncFunction();
            this.endTiming(operationName);
            return result;
        } catch (error) {
            this.endTiming(operationName);
            throw error;
        }
    }

    // Measure sync operation
    measureSync(operationName, syncFunction) {
        if (!this.enabled) {
            return syncFunction();
        }

        this.startTiming(operationName);
        try {
            const result = syncFunction();
            this.endTiming(operationName);
            return result;
        } catch (error) {
            this.endTiming(operationName);
            throw error;
        }
    }

    // Get performance report
    getReport() {
        const report = {};
        for (const [operation, metric] of this.metrics) {
            if (metric.duration !== null) {
                report[operation] = {
                    duration: metric.duration,
                    startTime: metric.startTime,
                    endTime: metric.endTime
                };
            }
        }
        return report;
    }

    // Clear all metrics
    clear() {
        this.metrics.clear();
    }

    // Enable/disable monitoring
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    // Monitor main thread blocking
    monitorMainThreadBlocking() {
        let lastTime = performance.now();
        let blockingThreshold = 16; // 16ms = 60fps threshold

        const checkBlocking = () => {
            const currentTime = performance.now();
            const timeDiff = currentTime - lastTime;
            
            if (timeDiff > blockingThreshold) {
                console.warn(`🚨 Main thread blocked for ${timeDiff.toFixed(2)}ms`);
            }
            
            lastTime = currentTime;
            requestAnimationFrame(checkBlocking);
        };

        requestAnimationFrame(checkBlocking);
    }

    // Monitor memory usage
    monitorMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            console.log(`💾 Memory Usage:
                Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
                Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB
                Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
        }
    }

    // Log performance summary
    logSummary() {
        const report = this.getReport();
        const operations = Object.keys(report);
        
        if (operations.length === 0) {
            console.log('📊 No performance metrics recorded');
            return;
        }

        console.log('📊 Performance Summary:');
        operations.forEach(operation => {
            const metric = report[operation];
            console.log(`  ${operation}: ${metric.duration.toFixed(2)}ms`);
        });

        // Calculate total time
        const totalTime = operations.reduce((sum, op) => sum + report[op].duration, 0);
        console.log(`  Total measured time: ${totalTime.toFixed(2)}ms`);
    }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Enhanced wrapper functions for common operations
async function measureCryptoOperation(operationName, operation) {
    return await performanceMonitor.measureAsync(`Crypto: ${operationName}`, operation);
}

async function measureTemplateLoad(templateName, loadFunction) {
    return await performanceMonitor.measureAsync(`Template Load: ${templateName}`, loadFunction);
}

async function measureWindowCreation(windowType, creationFunction) {
    return await performanceMonitor.measureAsync(`Window Creation: ${windowType}`, creationFunction);
}

// Start monitoring main thread blocking on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        performanceMonitor.monitorMainThreadBlocking();
    });
} else {
    performanceMonitor.monitorMainThreadBlocking();
}

// Expose global functions for debugging
window.performanceMonitor = performanceMonitor;
window.measureCryptoOperation = measureCryptoOperation;
window.measureTemplateLoad = measureTemplateLoad;
window.measureWindowCreation = measureWindowCreation;