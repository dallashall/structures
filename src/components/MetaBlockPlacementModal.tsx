import {
  Dialog,
  DialogContainer,
  Heading,
  Divider,
  Content,
  ButtonGroup,
  Button,
  Text,
  View,
} from '@adobe/react-spectrum';

interface MetaBlockPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MetaBlockPlacementModal - Informational modal before meta block placement
 *
 * Explains the purpose of the meta block and guides the user to place it
 * as their first action after creating a new project.
 *
 * Features:
 * - Heading and description of meta block purpose
 * - Placeholder for image/illustration (future enhancement)
 * - "Got it" button to close and enter placement mode
 *
 * Uses React Spectrum Dialog for consistent theming and accessibility.
 */
export function MetaBlockPlacementModal({
  isOpen,
  onClose,
}: MetaBlockPlacementModalProps) {
  const handleGotIt = () => {
    onClose();
  };

  return (
    <DialogContainer onDismiss={handleGotIt}>
      {isOpen && (
        <Dialog>
          <Heading>Place the Meta Block</Heading>
          <Divider />
          <Content>
            <View>
              <Text>
                The <strong>meta block</strong> is the origin point for your structure.
                It represents the location where the structure will be activated
                in-game.
              </Text>

              <Text marginTop="size-150">
                <strong>Key points:</strong>
              </Text>
              <ul>
                <li>
                  All other blocks are positioned relative to the meta block
                </li>
                <li>
                  It has a directional arrow showing the "front" of your structure
                </li>
                <li>
                  In-game, this represents either an activatable block or a player
                  holding an item
                </li>
                <li>
                  <strong>Note:</strong> Once placed, the meta block cannot be moved
                </li>
              </ul>

              {/* Placeholder for image/illustration */}
              {/* <Image src="/meta-block-illustration.png" alt="Meta block example" /> */}

              <Text marginTop="size-150">
                Click on any 2D view to place the meta block and begin building
                your structure.
              </Text>
            </View>
          </Content>
          <ButtonGroup>
            <Button variant="accent" onPress={handleGotIt} autoFocus>
              Got it
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogContainer>
  );
}
