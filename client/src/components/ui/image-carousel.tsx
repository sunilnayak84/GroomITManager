
import React, { useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent } from './dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './alert-dialog';
import type { AppointmentImage } from '@/lib/schema';

interface ImageCarouselProps {
  images: AppointmentImage[];
  type: 'before' | 'after';
  onImageUpload?: (file: File) => Promise<void>;
  onImageDelete?: (imageId: string) => Promise<void>;
  className?: string;
  disabled?: boolean;
}

export function ImageCarousel({ images, type, onImageUpload, onImageDelete, className }: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<AppointmentImage | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const scrollPrev = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      setIsLoading(true);
      try {
        await onImageUpload(file);
      } finally {
        setIsLoading(false);
        e.target.value = '';
      }
    }
  };

  const handleDeleteImage = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setImageToDelete(imageId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (imageToDelete && onImageDelete) {
      try {
        await onImageDelete(imageToDelete);
        setShowDeleteDialog(false);
        setImageToDelete(null);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {images.length > 0 ? (
          images.map((image) => (
            <div
              key={image.id}
              className="relative cursor-pointer"
              onClick={() => setPreviewImage(image)}
            >
              <img
                src={image.url}
                alt={`${type} image`}
                className="w-20 h-20 object-cover rounded-md"
              />
              {onImageDelete && (
                <button
                  onClick={(e) => handleDeleteImage(e, image.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-4 h-20 flex items-center justify-center bg-gray-100 text-gray-500 rounded-md">
            No images
          </div>
        )}
      </div>

      {onImageUpload && (
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isLoading}
            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          {isLoading && (
            <div className="ml-2 inline-flex items-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-sm text-gray-500">Uploading...</span>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          {previewImage && (
            <img
              src={previewImage.url}
              alt={`${type} image preview`}
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteDialog(false);
          setImageToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
