"use client"
import React from 'react'
import { Upload, X, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function UploadImage({ shopId }) {
  const [images, setImages] = useState([])
  const [state, setState] = useState({ dragActive: false })
  const inputRef = useRef(null)
    // border-muted 

    useEffect(() => {
      console.log(images)
    }, [images])

async function uploadFile({ file, shopId, onProgress }) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('shop', shopId)

  const xhr = new XMLHttpRequest()

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        const percent = Math.round((e.loaded / e.total) * 100)
        onProgress(percent)
      }
    })

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject({ error: xhr.responseText, status: xhr.status })
      }
    }

    xhr.onerror = () => reject({ error: 'Upload failed' })

    xhr.open('POST', '/api/v1/products/upload-image') // ← your route path here
    xhr.send(formData)
  })
}
    


    function handleFiles(files) {
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))

      const newImages = imageFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'uploading',
      }))

      const startIndex = images.length
      const allImages = [...images, ...newImages]
      setImages(allImages)

      // Start upload for each new image
      newImages.forEach((img, i) => {
        const index = startIndex + i
        uploadFile({
          file: img.file,
          shopId: shopId, // TODO: replace with actual dynamic shopId
          onProgress: (percent) => {
            setImages((prev) => {
              const updated = [...prev]
              updated[index].progress = percent
              return updated
            })
          },
        })
          .then((res) => {
            setImages((prev) => {
              const updated = [...prev]
              updated[index].status = 'uploaded'
              return updated
            })
          })
          .catch((err) => {
            console.error('Upload failed', err)
            setImages((prev) => {
              const updated = [...prev]
              updated[index].status = 'error'
              return updated
            })
          })
      })
    }

    function handleChange(e){
      if (!e.target.files) return
      handleFiles(e.target.files)
    }

    function handleDrop(e){
      e.preventDefault()
      e.stopPropagation()
      setState({ dragActive: false })
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }


    function handleDragOver(e){
      e.preventDefault()
      e.stopPropagation()
      setState({ dragActive: true })
    }

    function handleDragLeave(e){
      e.preventDefault()
      e.stopPropagation()
      setState({ dragActive: false })
    }

  function handleClick() {
    inputRef.current?.click()
  }

  const removeImage = (index) => {
    const updated = [...images]
    URL.revokeObjectURL(updated[index].preview)
    updated.splice(index, 1)
    setImages(updated)
  }
  return (

    <>
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className="relative cursor-pointer border-2 border-dashed border-gray-200 hover:border-accent-foreground/20 text-muted-foreground dark:border-neutral-700 hover:bg-muted/60 dark:hover:bg-muted/20 bg-background dark:bg-muted/10 flex flex-col items-center justify-center rounded-md p-6 text-center transition-all duration-300 ease-in-out gap-4 ">
      <input type="file" accept=".jpg,.jpeg,.png" onChange={handleChange}
          multiple
          className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
      />

      <Upload className="h-8 w-8 text-muted-foreground" />

      <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-medium leading-none">
          Drop product images here or click to upload
          </p>
          <p className="text-sm text-muted-foreground">
          You can upload files up to 10MB in size. Supported formats: JPG, PNG, PDF.
          </p>
      </div>
      </div>
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img, index) => (
            <div key={index} className="relative group">
              <img
                src={img.preview}
                alt={`preview-${index}`}
                className="rounded-md object-cover h-32 w-full border border-muted"
              />
              <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 z-20 bg-black text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>

              {/* Upload Progress */}
              {img.status === 'uploading' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                  <div
                    className="bg-accent h-full transition-all duration-200 ease-linear"
                    style={{ width: `${img.progress}%` }}
                  ></div>
                </div>
              )}

              {/* Upload Error Icon & Retry Button */}
              {img.status === 'error' && (
                <div className="absolute inset-0 bg-black/50 pointer-events-none flex flex-col items-center justify-center text-white text-xs rounded-md space-y-1">
                  <p className="text-red-400">Upload failed</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const retryImg = images[index]
                      uploadFile({
                        file: retryImg.file,
                        shopId,
                        onProgress: (percent) => {
                          setImages((prev) => {
                            const updated = [...prev]
                            updated[index].progress = percent
                            return updated
                          })
                        },
                      })
                        .then(() => {
                          setImages((prev) => {
                            const updated = [...prev]
                            updated[index].status = 'uploaded'
                            return updated
                          })
                        })
                        .catch((err) => {
                          console.error('Retry upload failed', err)
                          setImages((prev) => {
                            const updated = [...prev]
                            updated[index].status = 'error'
                            return updated
                          })
                        })

                      setImages((prev) => {
                        const updated = [...prev]
                        updated[index].status = 'uploading'
                        updated[index].progress = 0
                        return updated
                      })
                    }}
                    className="bg-white text-black px-2 py-1 rounded text-xs hover:bg-gray-100 pointer-events-auto"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
