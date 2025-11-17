const Footer = () => {
  const teamMembers = [
    { name: "Manish Sharma", rollNo: "RTU Roll No: 24EARAD094" },
    { name: "Lakshya Singhal", rollNo: "RTU Roll No: 24EARAD090" },
    { name: "Kuldeep Sihag", rollNo: "RTU Roll No: 24EARAD084" },
    { name: "Kumawat Yogesh", rollNo: "RTU Roll No: 24EARAD085" },
    { name: "Lakshya Goyal", rollNo: "RTU Roll No: 24EARAD089" },
  ];

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6">
          <h3 className="text-lg font-semibold text-foreground">Team Project - DS-B</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {teamMembers.map((member, index) => (
              <div key={index} className="space-y-1">
                <p className="font-medium text-foreground">{member.name}</p>
                {member.rollNo && (
                  <p className="text-sm text-muted-foreground">{member.rollNo}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
