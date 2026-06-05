import React from 'react';

interface FlexLayoutProps {
    children: React.ReactNode;
}

const FlexLayout: React.FC<FlexLayoutProps> = ({ children }) => {
    return (
        <div className="flex flex-col lg:flex-row justify-center items-start gap-3 lg:gap-5 p-0">
            {children}
        </div>
    );
};

export default FlexLayout;
