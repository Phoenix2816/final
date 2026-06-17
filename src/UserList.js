import React, { useState, useContext, useEffect, useCallback } from "react";
import User from "./User";
import { UserContext } from "./UserContext";
import UserAction from "./UserAction";

const UserList = () => {

    const { users, setUsers } = useContext(UserContext);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [sortConfig, setSortConfig] =
        useState({
            key: "last_login_time",
            direction: "desc"
        });

    const refreshUsers = useCallback(async () => {
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/users`
            );

            const data = await response.json();

            setUsers(data);
        } catch (error) {
            console.error("Failed to refresh users:", error);
        }
    }, [setUsers]);

    useEffect(() => {

        refreshUsers();

        const handleUserChanged = () => {
            refreshUsers();
        };

        window.addEventListener(
            "userChanged",
            handleUserChanged
        );

        return () => {

            window.removeEventListener(
                "userChanged",
                handleUserChanged
            );

        };

    }, [refreshUsers]);

    const select = () => {

        if (
            selectedUsers.length === users.length
        ) {

            setSelectedUsers([]);

        } else {

            setSelectedUsers(
                users.map(
                    user => user.id
                )
            );

        }
    };

    const handleSort = (key) => {

        setSortConfig(prev => {

            if (prev.key === key) {

                return {
                    key,
                    direction:
                        prev.direction === "asc"
                            ? "desc"
                            : "asc"
                };

            }

            return {
                key,
                direction: "desc"
            };

        });
    };

    const sortedUsers =
        [...users].sort((a, b) => {

            if (!sortConfig.key) {
                return 0;
            }

            let valueA =
                a[sortConfig.key];

            let valueB =
                b[sortConfig.key];

            if (
                sortConfig.key ===
                "last_login_time"
            ) {

                valueA = valueA
                    ? new Date(valueA).getTime()
                    : 0;

                valueB = valueB
                    ? new Date(valueB).getTime()
                    : 0;
            }

            if (
                typeof valueA === "string"
            ) {

                valueA =
                    valueA.toLowerCase();

                valueB =
                    valueB.toLowerCase();
            }

            if (valueA < valueB) {

                return sortConfig.direction === "asc"
                    ? -1
                    : 1;
            }

            if (valueA > valueB) {

                return sortConfig.direction === "asc"
                    ? 1
                    : -1;
            }

            return 0;
        });

    const renderSortIcon = (
        columnKey
    ) => {

        const isActive =
            sortConfig.key === columnKey;

        const iconStyle = {
            cursor: "pointer",
            width: "16px",
            height: "16px",
            display: "inline-block",
            opacity: isActive ? 1 : 0.4,
            fill: isActive
                ? "#000000"
                : "#3b3b3b",
            verticalAlign: "middle",
            marginLeft: "5px"
        };

        if (
            sortConfig.direction === "asc"
        ) {

            return (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 1024 1024" style={iconStyle} onClick={() => handleSort( columnKey )}>
                    <path d="M903.232 768l56.768-50.432L512 256l-448 461.568 56.768 50.432L512 364.928z" fill={iconStyle.fill}/>
                </svg>
            );
        }

        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 1024 1024" style={iconStyle} onClick={() => handleSort(columnKey)}>
                <path d="M903.232 256l56.768 50.432L512 768 64 306.432 120.768 256 512 659.072z" fill={iconStyle.fill}/>
            </svg>
        );
    };

    return (
        <div className="container">

            <UserAction
                selectedUsers={
                    selectedUsers
                }
                setSelectedUsers={
                    setSelectedUsers
                }
            />

            <table>
                <thead>
                    <tr>

                        <th>
                            <input
                                type="checkbox"
                                checked={
                                    users.length >
                                        0 &&
                                    selectedUsers.length ===
                                        users.length
                                }
                                onChange={
                                    select
                                }
                            />
                        </th>

                        <th>
                            Name
                            {renderSortIcon(
                                "name"
                            )}
                        </th>

                        <th>
                            Email
                            {renderSortIcon(
                                "email"
                            )}
                        </th>

                        <th>
                            Status
                            {renderSortIcon("status")}
                        </th>

                        <th>
                            Last Login Time
                            {renderSortIcon("last_login_time")}
                        </th>

                    </tr>
                </thead>

                <tbody>

                    {sortedUsers.map(
                        user => (
                            <User
                                key={user.id}
                                id={user.id}
                                name={user.name}
                                info={user.info}
                                email={user.email}
                                status={user.status}
                                is_blocked={user.is_blocked}
                                last_login_time={user.last_login_time}
                                selectedUsers={selectedUsers}
                                setSelectedUsers={setSelectedUsers}
                            />
                        )
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default UserList;