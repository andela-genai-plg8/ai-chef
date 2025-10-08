import classNames from "classnames";
import React, { CSSProperties } from "react";
import { Link } from "react-router-dom";
import styles from "./Styles.module.scss"
import { useAuth } from "@/hooks/useAuth";

export type SidebarProps = {
  className?: string;
  style?: CSSProperties
  personal?: boolean;
};

const TopMenu: React.FC<SidebarProps> = ({ className = "", style = {}, personal = false }) => {
  const { user } = useAuth();
  const filterByUser = personal && user?.uid ? user.uid : undefined;

  return (
    <div className={classNames(styles.TopMenu, styles.Links, className)} style={style}>
      <Link to="/recipes" className={classNames(styles.BackLink, { [styles.Active]: !filterByUser })}>All Recipes</Link>

      <Link to="/my/recipes" className={classNames(styles.BackLink, { [styles.Active]: filterByUser })}>My Recipes</Link>
    </div>
  );
};

export default TopMenu;
