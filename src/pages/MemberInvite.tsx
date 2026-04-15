import { Navigate } from "react-router-dom";

/**
 * Legacy route — redirects to the canonical /my-profile page.
 * Kept as a redirect to avoid breaking old bookmarks.
 */
const MemberInvite = () => {
  return <Navigate to="/my-profile" replace />;
};

export default MemberInvite;
