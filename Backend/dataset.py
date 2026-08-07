import os
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

def get_transforms(is_training=True):
    """
    Returns the composition of transforms for the dataset.
    For ultrasound images, robust augmentation helps prevent overfitting.
    """
    if is_training:
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.5),
            transforms.RandomRotation(degrees=30),
            transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
            transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
            transforms.ToTensor(),
            # Standard ImageNet normalization since we are using pre-trained ResNet
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    else:
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

def get_dataloaders(data_dir, batch_size=32, num_workers=4):
    """
    Loads images from the train and val directories inside data_dir.
    Assumes standard ImageFolder structure: data_dir/train/class_name and data_dir/val/class_name
    """
    train_dir = os.path.join(data_dir, 'train')
    val_dir = os.path.join(data_dir, 'val')
    
    if not os.path.exists(train_dir) or not os.path.exists(val_dir):
        raise FileNotFoundError(f"Ensure that {train_dir} and {val_dir} exist and contain your image classes.")

    train_dataset = datasets.ImageFolder(root=train_dir, transform=get_transforms(is_training=True))
    val_dataset = datasets.ImageFolder(root=val_dir, transform=get_transforms(is_training=False))

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    
    class_names = train_dataset.classes
    return train_loader, val_loader, class_names
