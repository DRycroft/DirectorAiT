import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, Calendar } from "lucide-react";

interface BoardMemberCardProps {
  member: {
    id: string;
    full_name: string;
    preferred_title?: string;
    public_job_title?: string;
    short_bio?: string;
    public_photo_url?: string;
    personal_mobile?: string;
    personal_email?: string;
    appointment_date?: string;
    term_expiry?: string;
    status: string;
  };
  onClick?: () => void;
}

const BoardMemberCard = ({ member, onClick }: BoardMemberCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "invited":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={member.public_photo_url} />
            <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {member.preferred_title && `${member.preferred_title} `}
                {member.full_name}
              </CardTitle>
              <Badge variant={getStatusColor(member.status)}>
                {member.status}
              </Badge>
            </div>
            {member.public_job_title && (
              <p className="text-sm text-muted-foreground mt-1">
                {member.public_job_title}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {member.short_bio && (
          <p className="text-sm line-clamp-2">{member.short_bio}</p>
        )}
        <div className="space-y-2 text-sm text-muted-foreground">
          {member.personal_email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{member.personal_email}</span>
            </div>
          )}
          {member.personal_mobile && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{member.personal_mobile}</span>
            </div>
          )}
          {member.appointment_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Appointed: {new Date(member.appointment_date).toLocaleDateString()}
                {member.term_expiry && (
                  <> · Expires: {new Date(member.term_expiry).toLocaleDateString()}</>
                )}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BoardMemberCard;
