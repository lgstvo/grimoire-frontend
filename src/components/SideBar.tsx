import { GiSecretBook } from "react-icons/gi";
import { BsPencilSquare } from "react-icons/bs";

const ICON_SIZE=48;

export const SideBar = () => {
    return (
        <div className="fixed top-0 left-0 h-screen w-16 m-0
        flex flex-col
        bg-githubgray text-white shadow-lg">
            <SideBarIcon icon={<BsPencilSquare size={ICON_SIZE}/>} text="Canvas"/>
            <SideBarIcon icon={<GiSecretBook size={ICON_SIZE}/>} text="Gallery"/>
        </div>
    );
};

interface SideBarIconProps {
    icon: React.ReactNode;
    text?: string;
}

const SideBarIcon = ({ icon, text = 'Tooltip'}: SideBarIconProps) => {
    return (
        <div className="relative flex items-center justify-center
            h-12 w-12 mb=2 mx-auto shadow-lg my-3 p-2
            bg-gray-800 text-green-400
            hover:bg-green-600 hover:text-white
            rounded-3xl hover:rounded-xl cursor-pointer
            transition-all group">
            {icon}
            <span className="absolute w-auto p-2 m-2 min-w-max left-14
                rounded-md shadow-md
                text-white bg-githubgray
                text-xs font-bold
                transition-all origion-left scale-0 group-hover:scale-100">
                {text}
            </span>
        </div>
    );
};