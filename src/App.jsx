import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import Select from "react-select";
import "./App.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const App = () => {
  const [projects, setProjects] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [voted, setVoted] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [voteLoading, setVoteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceId(result.visitorId);

        const { data: voteData } = await supabase
          .from("votes_day2")
          .select("id")
          .eq("device_id", result.visitorId);

        if (voteData.length > 0) setVoted(true);

        const { data: projectsData, error: projectsError } = await supabase
          .from("teams")
          .select("id, project_title")
          .order("project_title")
          .eq("track", "track3");
        

        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
        await fetchLeaderboard();
      } catch (error) {
        setErrorMessage("Error loading data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc("leaderboard_day2");
      if (error) throw error;
      setLeaderboard(data.map(item => ({
        project_id: item.project_id,
        votes: item.vote_count,
        project_title: item.project_title || "Unknown Project",
      })));
    } catch (error) {
      setErrorMessage("Error loading leaderboard.");
    }
  };

  const handleVote = async () => {
    if (!selectedProject) {
      alert("Please select a project to vote!");
      return;
    }
    setVoteLoading(true);
    try {
      const { data: existingVote } = await supabase
        .from("votes_day2")
        .select("id")
        .eq("device_id", deviceId);

      if (existingVote.length > 0) {
        alert("You have already voted!");
        setVoted(true);
        setVoteLoading(false);
        return;
      }
      const { error } = await supabase
        .from("votes_day2")
        .insert([{ project_id: selectedProject.value, device_id: deviceId }]);
      if (error) throw error;
      setVoted(true);
      alert("Vote submitted!");
      await fetchLeaderboard();
    } catch (error) {
      console.log(error);
      
      alert("Failed to submit vote.");
    } finally {
      setVoteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="title">YUKTHI: Project Expo - DAY 2</h1>

      <div className="vote-section">
        <h2>Vote for a Project</h2>
        <Select
          options={projects.map(proj => ({ value: proj.id, label: proj.project_title }))}
          onChange={setSelectedProject}
          placeholder="Select a project"
          isDisabled={voted}
        />
        <button
          className="vote-button"
          onClick={handleVote}
          disabled={voted || !selectedProject || voteLoading}
        >
          {voteLoading ? "Submitting..." : voted ? "Voted" : "Submit Vote"}
        </button>
      </div>

      {/* <div className="leaderboard-section">
        <h2>Top 5 Projects</h2>
        {leaderboard.length > 0 ? (
          <ul>
            {leaderboard.slice(0, 5).map((entry, index) => (
              <li key={entry.project_id}>
                <span className="rank">{index + 1}</span>
                <span className="project-title">{entry.project_title}</span>
                <span className="votes">{entry.votes}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No votes yet.</p>
        )}
      </div> */}
    </div>
  );
};

export default App;