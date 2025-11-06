import React from "react";
import SuperadminNavbar from "./SuperadminNavbar";

const SuperadminLayout = ({ children }) => {
  return (
    <>
      <SuperadminNavbar />
      <div className="pt-16">{children}</div>
    </>
  );
};

export default SuperadminLayout;

