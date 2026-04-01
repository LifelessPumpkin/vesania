'use client'

import { motion } from 'framer-motion'

export default function SlideUpPage({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ y: '100vh' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    )
}
