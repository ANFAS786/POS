import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Delete, Percent, Divide, Minus, Plus, Hash } from 'lucide-react';

const Calculator = ({ onClose }) => {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [isFinished, setIsFinished] = useState(false);

    // Using a safer alternative to eval for basic math
    const performCalc = (eq) => {
        try {
            // Remove spaces and validate basic math chars
            const sanitizedEq = eq.replace(/\s+/g, '').replace(/[^-+*/%0-9.]/g, '');
            // Simple recursive/iterative parser would be better, but for a POS utility, 
            // a scoped Function with sanitization is standard.
            const result = Function(`'use strict'; return (${sanitizedEq})`)();
            return isNaN(result) ? 'Error' : result;
        } catch (e) {
            return 'Error';
        }
    };

    const handleNumber = (num) => {
        if (display === '0' || isFinished) {
            setDisplay(num);
            setIsFinished(false);
        } else {
            // Prevent multiple decimals
            if (num === '.' && display.includes('.')) return;
            setDisplay(display + num);
        }
    };

    const handleOperator = (op) => {
        setIsFinished(false);

        // If we already have an operator and a display value, calculate the intermediate result
        if (equation && display !== '0') {
            const intermediate = performCalc(equation + display);
            if (intermediate !== 'Error') {
                setEquation(String(Number(intermediate.toFixed(8))) + ' ' + op + ' ');
                setDisplay('0');
                return;
            }
        }

        setEquation(display + ' ' + op + ' ');
        setDisplay('0');
    };

    const calculate = () => {
        if (!equation) return;

        const result = performCalc(equation + display);
        if (result === 'Error') {
            setDisplay('Error');
        } else {
            // Clean up decimal precision (max 8)
            const formattedResult = String(Number(Number(result).toFixed(8)));
            setDisplay(formattedResult);
            setEquation('');
            setIsFinished(true);
        }
    };

    const clear = () => {
        setDisplay('0');
        setEquation('');
        setIsFinished(false);
    };

    const backspace = () => {
        if (isFinished) {
            clear();
            return;
        }
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay('0');
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
            if (e.key === '.') handleNumber('.');
            if (e.key === '+') handleOperator('+');
            if (e.key === '-') handleOperator('-');
            if (e.key === '*') handleOperator('*');
            if (e.key === '/') handleOperator('/');
            if (e.key === '%') handleOperator('%');
            if (e.key === 'Enter' || e.key === '=') calculate();
            if (e.key === 'Backspace') backspace();
            if (e.key === 'Escape') onClose();
            if (e.key === 'c' || e.key === 'C') clear();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [display, equation, isFinished]);

    return createPortal(
        <div className="premium-calculator-container animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="calc-header">
                <div className="calc-title">
                    <Hash size={14} style={{ color: '#2563eb' }} />
                    <span style={{ color: '#0f172a' }}>QUICK CALC</span>
                </div>
                <button type="button" className="calc-close" onClick={onClose}>
                    <X size={16} />
                </button>
            </div>

            <div className="calc-display-section">
                <div className="calc-equation" style={{ color: '#64748b', fontSize: '0.8rem', height: '1.2rem' }}>{equation}</div>
                <div className="calc-main-display">{display}</div>
            </div>

            <div className="calc-grid">
                <button type="button" onClick={clear} className="calc-btn btn-danger">AC</button>
                <button type="button" onClick={backspace} className="calc-btn btn-util"><Delete size={18} /></button>
                <button type="button" onClick={() => handleOperator('%')} className="calc-btn btn-util"><Percent size={18} /></button>
                <button type="button" onClick={() => handleOperator('/')} className="calc-btn btn-op"><Divide size={18} /></button>

                <button type="button" onClick={() => handleNumber('7')} className="calc-btn">7</button>
                <button type="button" onClick={() => handleNumber('8')} className="calc-btn">8</button>
                <button type="button" onClick={() => handleNumber('9')} className="calc-btn">9</button>
                <button type="button" onClick={() => handleOperator('*')} className="calc-btn btn-op">×</button>

                <button type="button" onClick={() => handleNumber('4')} className="calc-btn">4</button>
                <button type="button" onClick={() => handleNumber('5')} className="calc-btn">5</button>
                <button type="button" onClick={() => handleNumber('6')} className="calc-btn">6</button>
                <button type="button" onClick={() => handleOperator('-')} className="calc-btn btn-op"><Minus size={18} /></button>

                <button type="button" onClick={() => handleNumber('1')} className="calc-btn">1</button>
                <button type="button" onClick={() => handleNumber('2')} className="calc-btn">2</button>
                <button type="button" onClick={() => handleNumber('3')} className="calc-btn">3</button>
                <button type="button" onClick={() => handleOperator('+')} className="calc-btn btn-op"><Plus size={18} /></button>

                <button type="button" onClick={() => handleNumber('0')} className="calc-btn btn-zero">0</button>
                <button type="button" onClick={() => handleNumber('.')} className="calc-btn">.</button>
                <button type="button" onClick={calculate} className="calc-btn btn-equals">=</button>
            </div>
        </div>,
        document.body
    );
};

export default Calculator;
