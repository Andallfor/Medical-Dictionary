import { fileData, fileType, formattedFileData } from "./input";
import { TextFileContainer, t_fileData } from "./textFile";
import { FormattedFileContainer, f_fileData } from "./formattedFile";
import { useContext } from "react";
import { FILE_CONTEXT, FOCUSED_WORD_CONTEXT } from "../util/context";

export default function FileSearch() {
    const phrase = useContext(FOCUSED_WORD_CONTEXT).get.trim().toLowerCase();
    const files = useContext(FILE_CONTEXT).get;

    if (phrase.length == 0) {
        return <div className="bg-tonal0 px-4 py-2 rounded-lg w-full min-w-0">No search phrase.</div>
    }

    return (
        <div className="bg-tonal0 px-4 py-2 rounded-lg w-full min-w-0">
            {files.length == 0 ? "No files uploaded." : files.map((x, i) => {
                if (x.type == fileType.TEXT) {
                    const tf: t_fileData = {
                        name: x.name,
                        content: x.content as string,
                        size: x.size,
                    };

                    return <TextFileContainer file={tf} phrase={phrase} key={i} />;
                } else {
                    const ff: f_fileData = {
                        name: x.name,
                        content: x.content as formattedFileData,
                        size: x.size,
                    };

                    return <FormattedFileContainer file={ff} phrase={phrase} key={i}/>;
                }
            })}
        </div>
    );
}