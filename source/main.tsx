import React from 'react';
import {createRoot} from 'react-dom/client';
import SharedGate from './app/shared-gate';
import './app/globals.css';
createRoot(document.getElementById('root')!).render(<SharedGate/>);
