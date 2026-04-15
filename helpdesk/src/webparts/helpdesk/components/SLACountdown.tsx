import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './SLACountdown.module.scss';
import { Icon } from '@fluentui/react';

export interface ISLACountdownProps {
    targetDate: Date;
    isResolved: boolean;
}

export const SLACountdown: React.FC<ISLACountdownProps> = ({ targetDate, isResolved }) => {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isOverdue, setIsOverdue] = useState<boolean>(false);

    useEffect(() => {
        if (isResolved) return;

        const calculateTime = () => {
            const now = new Date().getTime();
            const target = targetDate.getTime();
            const difference = target - now;

            setTimeLeft(Math.abs(difference));
            setIsOverdue(difference < 0);
        };

        calculateTime();
        const timer = setInterval(calculateTime, 60000); // Update every minute

        return () => clearInterval(timer);
    }, [targetDate, isResolved]);

    if (isResolved) {
        return (
            <div className={`${styles.slaBadge} ${styles.resolved}`}>
                <Icon iconName="CheckMark" /> SLA Met
            </div>
        );
    }

    const formatTime = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        return `${hours}h ${minutes}m`;
    };

    const getSLAState = () => {
        if (isOverdue) return styles.overdue;
        
        const now = new Date().getTime();
        const target = targetDate.getTime();
        const diff = target - now;
        
        // Less than 1 hour remains
        if (diff < 1000 * 60 * 60) return styles.critical;
        // Less than 4 hours remains
        if (diff < 1000 * 60 * 60 * 4) return styles.warning;
        
        return styles.success;
    };

    return (
        <div className={`${styles.slaBadge} ${getSLAState()}`}>
            <Icon iconName={isOverdue ? "Warning" : "Clock"} />
            <span className={styles.timeText}>
                {isOverdue ? "Overdue by " : ""} {formatTime(timeLeft)}
                {!isOverdue ? " left" : ""}
            </span>
        </div>
    );
};
