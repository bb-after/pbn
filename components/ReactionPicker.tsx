import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Tooltip,
  IconButton,
  Typography,
  Popover,
  CircularProgress,
  Badge,
  Button,
} from '@mui/material';
import axios from 'axios';

// Available emoji options
const EMOJI_OPTIONS = ['👍', '👎', '❤️', '😄', '🎉', '🤔'];

interface ReactionPickerProps {
  targetType: 'comment' | 'section_comment' | 'reply';
  targetId: number;
  requestId: number; // For client authorization check
  isClientPortal?: boolean;
  clientContactId?: number;
  userId?: string;
  token?: string; // Add token prop
}

interface ReactionUser {
  reaction_id: number;
  user_id: string | null;
  client_contact_id: number | null;
  name: string;
  created_at: string;
}

interface GroupedReactions {
  [emoji: string]: ReactionUser[];
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  targetType,
  targetId,
  requestId,
  isClientPortal = false,
  clientContactId,
  userId,
  token,
}) => {
  const [reactions, setReactions] = useState<GroupedReactions>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [addingEmoji, setAddingEmoji] = useState<string | null>(null);

  // Memoize fetchReactions to prevent unnecessary recreations
  const fetchReactions = useCallback(async () => {
    if (!targetId || !targetType) return;

    setLoading(true);
    setError(null);

    // Check which authentication method to use
    const headers: Record<string, string> = {};
    let hasAuth = false;

    try {
      // For staff users, use the auth token
      if (!isClientPortal) {
        // First try to use the token prop passed directly
        let staffToken = token;

        // If no token prop, try to get it from localStorage
        if (!staffToken && typeof window !== 'undefined') {
          const localToken = localStorage.getItem('usertoken');
          if (localToken) {
            staffToken = localToken;
          }
        }

        if (staffToken) {
          headers['x-auth-token'] = staffToken;
          hasAuth = true;
        }
      }
      // For client users, use client portal headers
      else if (isClientPortal && clientContactId) {
        headers['x-client-portal'] = 'true';
        headers['x-client-contact-id'] = clientContactId.toString();
        hasAuth = true;
      }

      if (!hasAuth) {
        setError('Authentication missing');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `/api/reactions?targetType=${targetType}&targetId=${targetId}`,
        { headers }
      );
      setReactions(response.data);
    } catch (err: any) {
      console.error('Error fetching reactions:', err);
      setError(err.response?.data?.error || 'Failed to load reactions');
    } finally {
      setLoading(false);
    }
  }, [targetId, targetType, isClientPortal, clientContactId, userId, token]);

  // Fetch reactions on mount and when dependencies change
  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Handle opening the emoji picker
  const handleOpenPicker = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle closing the emoji picker
  const handleClosePicker = () => {
    setAnchorEl(null);
  };

  // Check if the current user has added this emoji
  const hasUserReacted = (emoji: string) => {
    if (!reactions[emoji]) return false;

    if (isClientPortal && clientContactId) {
      return reactions[emoji].some(r => r.client_contact_id === clientContactId);
    } else if (userId) {
      return reactions[emoji].some(r => r.user_id === userId);
    }

    return false;
  };

  // Find the user's reaction ID for a specific emoji
  const getUserReactionId = (emoji: string) => {
    if (!reactions[emoji]) return null;

    if (isClientPortal && clientContactId) {
      const reaction = reactions[emoji].find(r => r.client_contact_id === clientContactId);
      return reaction?.reaction_id;
    } else if (userId) {
      const reaction = reactions[emoji].find(r => r.user_id === userId);
      return reaction?.reaction_id;
    }

    return null;
  };

  // Handle adding an emoji reaction
  const handleAddReaction = async (emoji: string) => {
    if (addingEmoji) return; // Prevent multiple simultaneous requests

    setAddingEmoji(emoji);

    // Check which authentication method to use
    const headers: Record<string, string> = {};
    let hasAuth = false;

    try {
      // For staff users, use the auth token
      if (!isClientPortal) {
        // First try to use the token prop passed directly
        let staffToken = token;

        // If no token prop, try to get it from localStorage
        if (!staffToken && typeof window !== 'undefined') {
          const localToken = localStorage.getItem('usertoken');
          if (localToken) {
            staffToken = localToken;
          }
        }

        if (staffToken) {
          headers['x-auth-token'] = staffToken;
          hasAuth = true;
        }
      }
      // For client users, use client portal headers
      else if (isClientPortal && clientContactId) {
        headers['x-client-portal'] = 'true';
        headers['x-client-contact-id'] = clientContactId.toString();
        hasAuth = true;
      }

      if (!hasAuth) {
        setError('Authentication missing');
        setAddingEmoji(null);
        return;
      }

      // If user already reacted with this emoji, remove it
      const existingReactionId = getUserReactionId(emoji);

      if (existingReactionId) {
        await axios.delete(`/api/reactions/${existingReactionId}`, { headers });
      } else {
        // Otherwise add the reaction
        await axios.post(
          '/api/reactions',
          {
            targetType,
            targetId,
            emoji,
            requestId,
          },
          { headers }
        );
      }

      // Refresh reactions
      fetchReactions();
    } catch (err: any) {
      console.error('Error toggling reaction:', err);
      setError(err.response?.data?.error || 'Failed to toggle reaction');
    } finally {
      setAddingEmoji(null);
      handleClosePicker();
    }
  };

  // Calculate total reaction count
  const getTotalReactionCount = () => {
    return Object.values(reactions).reduce((sum, users) => sum + users.length, 0);
  };

  const open = Boolean(anchorEl);

  return (
    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Error message */}
      {error && (
        <Typography variant="caption" color="error" sx={{ width: '100%', mb: 1 }}>
          {error}
        </Typography>
      )}

      {/* Existing reactions - Slack-style */}
      {!loading &&
        Object.entries(reactions).map(([emoji, users]) => (
          <Tooltip
            key={emoji}
            title={
              <>
                {users.map(user => (
                  <Box key={user.reaction_id}>
                    {user.name}
                    {(isClientPortal && user.client_contact_id === clientContactId) ||
                    (!isClientPortal && user.user_id === userId)
                      ? ' (You)'
                      : ''}
                  </Box>
                ))}
              </>
            }
            arrow
          >
            <Button
              size="small"
              onClick={() => handleAddReaction(emoji)}
              color={hasUserReacted(emoji) ? 'primary' : 'inherit'}
              disabled={!!addingEmoji}
              sx={{
                minWidth: 'auto',
                px: 1,
                py: 0.5,
                mr: 1,
                mb: 0.5,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: hasUserReacted(emoji) ? 'primary.main' : 'grey.300',
                backgroundColor: hasUserReacted(emoji) ? 'primary.50' : 'grey.50',
                '&:hover': {
                  backgroundColor: hasUserReacted(emoji) ? 'primary.100' : 'grey.200',
                },
                fontSize: '0.875rem',
              }}
            >
              {emoji} {users.length}
            </Button>
          </Tooltip>
        ))}

      {/* Add reaction button - Slack-style */}
      <Tooltip title="Add reaction">
        <Button
          size="small"
          onClick={handleOpenPicker}
          color="inherit"
          disabled={loading || !!addingEmoji}
          sx={{
            minWidth: 'auto',
            px: 1,
            py: 0.5,
            mb: 0.5,
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'grey.300',
            backgroundColor: 'grey.50',
            '&:hover': {
              backgroundColor: 'grey.200',
            },
            fontSize: '0.75rem',
          }}
        >
          {loading ? <CircularProgress size={16} /> : '+ Add reaction'}
        </Button>
      </Tooltip>

      {/* Emoji picker popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClosePicker}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', maxWidth: 240 }}>
          {EMOJI_OPTIONS.map(emoji => (
            <IconButton
              key={emoji}
              size="small"
              onClick={() => handleAddReaction(emoji)}
              color={hasUserReacted(emoji) ? 'primary' : 'default'}
              disabled={addingEmoji === emoji}
              sx={{
                p: 1,
                fontSize: '1.5rem',
                opacity: hasUserReacted(emoji) ? 1 : 0.7,
                '&:hover': { opacity: 1 },
              }}
            >
              {addingEmoji === emoji ? <CircularProgress size={20} /> : emoji}
            </IconButton>
          ))}
        </Box>
      </Popover>
    </Box>
  );
};

export default ReactionPicker;
