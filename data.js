const companies = [
  "Infosys", "TCS", "Wipro", "Accenture", "Capgemini", "Cognizant",
  "IBM", "Oracle", "SAP", "Dell", "Amazon", "Flipkart", "Swiggy", 
  "Razorpay", "PhonePe", "Paytm", "Zoho", "Freshworks", "Juspay", "CRED",
  "Groww", "Zerodha", "Pine Labs", "Zomato", "Dunzo"
];

const roles = [
  "SDE Intern", "Graduate Engineer Trainee", "Junior Backend Developer",
  "Frontend Intern", "QA Intern", "Data Analyst Intern",
  "Java Developer (0-1)", "Python Developer (Fresher)", "React Developer (1-3)",
  "Full Stack Intern", "Software Engineer I", "Cloud Operations Intern"
];

const locations = ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Gurugram", "Noida", "Mumbai"];
const modes = ["Remote", "Hybrid", "Onsite"];
const experiences = ["Fresher", "0-1", "1-3", "3-5"];
const sources = ["LinkedIn", "Naukri", "Indeed"];
const salaries = ["3–5 LPA", "6–10 LPA", "10–18 LPA", "₹15k–₹40k/month Internship", "Not Disclosed"];

const skillSets = [
  ["Java", "Spring Boot", "MySQL"],
  ["Python", "Django", "PostgreSQL"],
  ["React", "JavaScript", "HTML/CSS"],
  ["Node.js", "Express", "MongoDB"],
  ["AWS", "Docker", "Linux"],
  ["SQL", "Tableau", "Excel"],
  ["Selenium", "Java", "TestNG"],
  ["Angular", "TypeScript", "RxJS"],
  ["C++", "Data Structures", "Algorithms"]
];

const descriptions = [
  "Join our dynamic engineering team to build scalable systems. You will work closely with senior developers to design and implement robust APIs. We value clean code, testing, and continuous learning.",
  "We are looking for enthusiastic individuals passionate about creating pixel-perfect UIs. You will collaborate with design and product teams to deliver engaging user experiences. Strong problem-solving skills are a must.",
  "An excellent opportunity for early-career professionals to gain hands-on experience in cloud technologies. You will assist in maintaining infrastructure and developing deployment pipelines. Mentorship will be provided.",
  "Help us make data-driven decisions by analyzing complex datasets. You will build dashboards, write optimized SQL queries, and present findings to stakeholders. Experience with data visualization tools is preferred.",
  "Be a part of a fast-growing startup redefining the fintech landscape. You will take ownership of features from inception to deployment. We offer a fast-paced, high-growth environment for driven engineers."
];

function generateJobs(count) {
  const jobs = [];
  // Use a predictable seed for pseudo-randomness so data is stable
  let seed = 12345;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 1; i <= count; i++) {
    const company = companies[Math.floor(random() * companies.length)];
    const role = roles[Math.floor(random() * roles.length)];
    const location = locations[Math.floor(random() * locations.length)];
    const mode = modes[Math.floor(random() * modes.length)];
    const experience = experiences[Math.floor(random() * experiences.length)];
    const source = sources[Math.floor(random() * sources.length)];
    const skills = skillSets[Math.floor(random() * skillSets.length)];
    
    // Assign salary based on experience/role
    let salaryRange;
    if (role.includes("Intern")) {
      salaryRange = "₹15k–₹40k/month Internship";
    } else if (experience === "Fresher" || experience === "0-1") {
      salaryRange = "3–5 LPA";
    } else if (experience === "1-3") {
      salaryRange = "6–10 LPA";
    } else {
      salaryRange = salaries[Math.floor(random() * salaries.length)];
    }

    const postedDaysAgo = Math.floor(random() * 11); // 0 to 10
    const description = descriptions[Math.floor(random() * descriptions.length)];

    jobs.push({
      id: `job_${i}`,
      title: role,
      company: company,
      location: location,
      mode: mode,
      experience: experience,
      skills: skills,
      source: source,
      postedDaysAgo: postedDaysAgo,
      salaryRange: salaryRange,
      applyUrl: `https://example.com/apply/${i}`,
      description: description
    });
  }
  return jobs;
}

// Export global jobs array
window.JOB_DATA = generateJobs(60);
