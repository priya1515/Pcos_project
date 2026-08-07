import torch.nn as nn
from torchvision.models import resnet50, ResNet50_Weights

def get_model(num_classes=2, freeze_base=True):
    """
    Loads a pre-trained ResNet-50 model and replaces the final fully connected layer
    to output the desired number of classes (default 2: PCOS vs Normal).
    
    Args:
        num_classes: Number of output classes
        freeze_base: If True, freeze all base layers (Phase 1). 
                     If False, unfreeze layer3 and layer4 for fine-tuning (Phase 2).
    """
    # Load the pre-trained ResNet50 weights
    model = resnet50(weights=ResNet50_Weights.DEFAULT)
    
    if freeze_base:
        # Phase 1: Freeze everything
        for param in model.parameters():
            param.requires_grad = False
    else:
        # Phase 2: Freeze early layers, unfreeze later layers for fine-tuning
        for param in model.parameters():
            param.requires_grad = False
        # Unfreeze layer3 and layer4 (the deeper, more task-specific feature extractors)
        for param in model.layer3.parameters():
            param.requires_grad = True
        for param in model.layer4.parameters():
            param.requires_grad = True
        
    # Extract the number of input features for the final fully connected layer
    num_ftrs = model.fc.in_features
    
    # Replace the final layer with a regularized classification head
    model.fc = nn.Sequential(
        nn.Linear(num_ftrs, 512),
        nn.BatchNorm1d(512),
        nn.ReLU(),
        nn.Dropout(0.4),
        nn.Linear(512, 256),
        nn.BatchNorm1d(256),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(256, num_classes)
    )
    
    return model
