import React from 'react'

export const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '3rem',
    borderRadius: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    width: '100%',
    maxWidth: '400px',
    boxSizing: 'border-box',
}

export const inputStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
}

export const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.85rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    marginBottom: '0.35rem',
    display: 'block',
}

export const primaryButtonStyle: React.CSSProperties = {
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#6366f1',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '0.5rem',
    transition: 'background-color 0.2s, transform 0.1s',
}

export const ghostButtonStyle: React.CSSProperties = {
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid rgba(255,255,255,0.15)',
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    width: '100%',
    marginTop: '0.25rem',
    transition: 'border-color 0.2s, color 0.2s',
}