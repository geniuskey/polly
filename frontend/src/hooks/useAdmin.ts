import { useUser } from '@clerk/clerk-react';

const ADMIN_EMAILS = ['geniuskey@gmail.com'];

export const useAdmin = () => {
  const { user, isLoaded } = useUser();

  const isAdmin =
    isLoaded &&
    !!user?.primaryEmailAddress?.emailAddress &&
    ADMIN_EMAILS.includes(user.primaryEmailAddress.emailAddress.toLowerCase());

  return {
    isAdmin,
    isLoaded,
    email: user?.primaryEmailAddress?.emailAddress,
  };
};
