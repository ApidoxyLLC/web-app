"use client";;
import React from "react";

export const ToolbarContext = React.createContext(null);

export const ToolbarProvider = ({
    editor,
    children
}) => {
	return (
        <ToolbarContext.Provider value={{ editor }}>
            {children}
        </ToolbarContext.Provider>
    );
};

export const useToolbar = () => {
	const context = React.useContext(ToolbarContext);

	if (!context) {
		throw new Error("useToolbar must be used within a ToolbarProvider");
	}

	return context;
};
