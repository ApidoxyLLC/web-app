import React, { useState, useRef } from "react";

function CustomTagInput({ placeholder, tags, setTags, activeTagIndex, setActiveTagIndex }) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!tags.includes(inputValue.trim())) {
        setTags([...tags, inputValue.trim()]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue) {
    
      setTags(tags.slice(0, tags.length - 1));
    }
  };

  const removeTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  return (
    <div
      className="flex flex-wrap items-center border  p-2 gap-2 cursor-text rounded-md"
      onClick={() => inputRef.current.focus()}
    >
      {tags.map((tag, index) => (
        <div
          key={index}
          className={`flex items-center gap-1 px-2 rounded border bg-muted/100`}
          onClick={() => setActiveTagIndex(index)}
        >
          {tag}
          <button
            type="button"
            className="text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(index);
            }}
          >
            ×
          </button>
        </div>
      ))}

      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] border-none outline-none"
      />
    </div>
  );
}

export default CustomTagInput;
