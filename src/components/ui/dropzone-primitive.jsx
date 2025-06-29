"use client";;
import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import * as React from "react";
import { useDropzone as useReactDropzone } from "react-dropzone";

const DropzoneContext = React.createContext({});

function useDropzone() {
  const context = React.useContext(DropzoneContext);
  if (!context) {
    throw new Error("useDropzone must be used within a <Dropzone />.");
  }

  return context;
}

function Dropzone({
  children,
  ...props
}) {
  const state = useReactDropzone(props);
  const context = { ...state, ...props };

  return (
    <DropzoneContext.Provider value={context}>
      {typeof children === "function" ? children(context) : children}
    </DropzoneContext.Provider>
  );
}

function DropzoneInput(props) {
  const { getInputProps, disabled } = useDropzone();

  return (<Primitive.input data-slot="dropzone-input" {...getInputProps({ disabled, ...props })} />);
}

function DropzoneZone(props) {
  const {
    getRootProps,
    isFocused,
    isDragActive,
    isDragAccept,
    isDragReject,
    isFileDialogActive,
    preventDropOnDocument,
    noClick,
    noKeyboard,
    noDrag,
    noDragEventsBubbling,
    disabled,
  } = useDropzone();

  return (
    <Primitive.div
      data-slot="dropzone-zone"
      data-prevent-drop-on-document={preventDropOnDocument || undefined}
      data-no-click={noClick || undefined}
      data-no-keyboard={noKeyboard || undefined}
      data-no-drag={noDrag || undefined}
      data-no-drag-events-bubbling={noDragEventsBubbling || undefined}
      data-disabled={disabled || undefined}
      data-focused={isFocused || undefined}
      data-drag-active={isDragActive || undefined}
      data-drag-accept={isDragAccept || undefined}
      data-drag-reject={isDragReject || undefined}
      data-file-dialog-active={isFileDialogActive || undefined}
      {...getRootProps(props)} />
  );
}

function DropzoneTrigger({
  onClick,
  ...props
}) {
  const { open } = useDropzone();

  return (
    <Primitive.button
      data-slot="dropzone-trigger"
      onClick={composeEventHandlers(onClick, open)}
      {...props} />
  );
}

function DropzoneDragAccepted({
  children
}) {
  const { isDragAccept } = useDropzone();
  if (!isDragAccept) return null;
  return <div data-slot="dropzone-drag-accepted">{children}</div>;
}

function DropzoneDragRejected({
  children
}) {
  const { isDragReject } = useDropzone();
  if (!isDragReject) {
    return null;
  }

  return <div data-slot="dropzone-drag-rejected">{children}</div>;
}

function DropzoneDragDefault({
  children
}) {
  const { isDragActive } = useDropzone();
  if (isDragActive) {
    return null;
  }

  return <div data-slot="dropzone-drag-default">{children}</div>;
}

function DropzoneAccepted({
  children
}) {
  const { acceptedFiles } = useDropzone();
  return <div data-slot="dropzone-accepted">{children(acceptedFiles)}</div>;
}

function DropzoneRejected({
  children
}) {
  const { fileRejections } = useDropzone();
  return <div data-slot="dropzone-rejected">{children(fileRejections)}</div>;
}

export {
  Dropzone as Root,
  DropzoneInput as Input,
  DropzoneZone as Zone,
  DropzoneTrigger as Trigger,
  DropzoneDragAccepted as DragAccepted,
  DropzoneDragRejected as DragRejected,
  DropzoneDragDefault as DragDefault,
  DropzoneAccepted as Accepted,
  DropzoneRejected as Rejected,
};
